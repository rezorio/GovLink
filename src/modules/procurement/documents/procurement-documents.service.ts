import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { ContractStatus, Prisma, ProcurementDocType } from '@prisma/client';
import { TenantContext } from '../../common/interfaces/auth.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { assertTenantFileKey } from '../../common/utils/file-key.util';
import { PrismaService } from '../../prisma/prisma.module';
import { UploadsService } from '../../uploads/uploads.service';
import {
    CreateProcurementDocumentDto,
    VoidProcurementDocumentDto,
} from '../dto/create-document.dto';
import { normalizeSupplierName } from '../splitting.util';
import {
    DEFAULT_MIN_QUOTATIONS,
    evaluateChain,
    nextStepRequirements,
    requirementsForTargetStatus,
} from './document-chain.util';

function serializeBigInt<T>(value: T): T {
    return JSON.parse(
        JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)),
    ) as T;
}

const POST_AWARD_STATUSES: ContractStatus[] = [
    ContractStatus.AWARDED,
    ContractStatus.ACTIVE,
    ContractStatus.COMPLETED,
];

const POST_AWARD_DOC_TYPES: ProcurementDocType[] = [
    ProcurementDocType.CONTRACT_DOC,
    ProcurementDocType.DELIVERY_RECEIPT,
    ProcurementDocType.INSPECTION_ACCEPTANCE,
];

function isPostAwardDocType(docType: ProcurementDocType): boolean {
    return POST_AWARD_DOC_TYPES.includes(docType);
}

@Injectable()
export class ProcurementDocumentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
        private readonly auditLog: AuditLogService,
        private readonly uploads: UploadsService,
    ) {}

    async listDocuments(ctx: TenantContext, contractId: string) {
        await this.requireContract(ctx, contractId);
        const rows = await this.prisma.procurementDocument.findMany({
            where: {
                contractId,
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
            },
            orderBy: [{ docType: 'asc' }, { version: 'desc' }, { createdAt: 'desc' }],
        });
        return serializeBigInt(rows);
    }

    async getChain(ctx: TenantContext, contractId: string) {
        const contract = await this.requireContract(ctx, contractId);
        const active = await this.activeDocSummaries(contractId);
        const { nextStatus, requirements } = nextStepRequirements(
            contract.status,
            contract.mode,
            DEFAULT_MIN_QUOTATIONS,
        );
        const evaluation = evaluateChain(active, requirements);

        const allReqs = [
            ...nextStepRequirements(ContractStatus.PLANNED, contract.mode).requirements,
            ...nextStepRequirements(ContractStatus.RFQ_ISSUED, contract.mode).requirements,
            ...nextStepRequirements(ContractStatus.QUOTATIONS_RECEIVED, contract.mode).requirements,
            ...nextStepRequirements(ContractStatus.EVALUATION, contract.mode).requirements,
            ...nextStepRequirements(ContractStatus.AWARD_RECOMMENDED, contract.mode).requirements,
        ];
        // Deduplicate by docType keeping highest minCount
        const fullMap = new Map<string, (typeof allReqs)[0]>();
        for (const req of allReqs) {
            const prev = fullMap.get(req.docType);
            if (!prev || req.minCount > prev.minCount) {
                fullMap.set(req.docType, req);
            }
        }
        const fullChecklist = evaluateChain(active, [...fullMap.values()]);

        return serializeBigInt({
            contractId,
            status: contract.status,
            mode: contract.mode,
            nextStatus,
            minQuotations: DEFAULT_MIN_QUOTATIONS,
            nextStep: evaluation,
            checklist: fullChecklist.items,
            splittingFlagged: contract.splittingFlagged,
            splittingAcknowledged: Boolean(contract.splittingAcknowledgedAt),
            canAdvance:
                evaluation.ok &&
                !(
                    nextStatus === ContractStatus.AWARDED &&
                    contract.splittingFlagged &&
                    !contract.splittingAcknowledgedAt
                ),
        });
    }

    async createDocument(ctx: TenantContext, contractId: string, dto: CreateProcurementDocumentDto) {
        this.tenantScope.assertBarangayScope(ctx);
        const contract = await this.requireContract(ctx, contractId);

        if (contract.status === ContractStatus.COMPLETED) {
            throw new BadRequestException('Cannot add documents after completion');
        }

        if (POST_AWARD_STATUSES.includes(contract.status)) {
            if (!isPostAwardDocType(dto.docType)) {
                throw new BadRequestException(
                    'After award, only contract, delivery, and acceptance documents may be attached',
                );
            }
        } else if (
            dto.docType === ProcurementDocType.DELIVERY_RECEIPT ||
            dto.docType === ProcurementDocType.INSPECTION_ACCEPTANCE
        ) {
            throw new BadRequestException(
                'Delivery and acceptance documents are only allowed after award',
            );
        }

        if (dto.docType === ProcurementDocType.QUOTATION) {
            if (!dto.quotationSupplierName || dto.quotationAmountCentavos == null) {
                throw new BadRequestException(
                    'Quotations require quotationSupplierName and quotationAmountCentavos',
                );
            }
            const normalized = normalizeSupplierName(dto.quotationSupplierName);
            const existingQuotes = await this.prisma.procurementDocument.findMany({
                where: {
                    contractId,
                    docType: ProcurementDocType.QUOTATION,
                    voidedAt: null,
                },
                select: { quotationSupplierName: true },
            });
            const duplicate = existingQuotes.some(
                (q) =>
                    q.quotationSupplierName &&
                    normalizeSupplierName(q.quotationSupplierName) === normalized,
            );
            if (duplicate) {
                throw new BadRequestException(
                    'A quotation from this supplier already exists on the contract',
                );
            }
        } else {
            if (!dto.fileKey || !dto.fileName || !dto.mimeType || dto.fileSizeBytes == null) {
                throw new BadRequestException('Document file metadata is required');
            }
            assertTenantFileKey(ctx, dto.fileKey, 'procurement');
            await this.uploads.assertObjectExists(ctx, dto.fileKey);
        }

        if (dto.quotationFileKey) {
            assertTenantFileKey(ctx, dto.quotationFileKey, 'procurement');
            await this.uploads.assertObjectExists(ctx, dto.quotationFileKey);
        }

        const latest = await this.prisma.procurementDocument.findFirst({
            where: {
                contractId,
                docType: dto.docType,
                voidedAt: null,
            },
            orderBy: { version: 'desc' },
            select: { version: true },
        });

        const version =
            dto.docType === ProcurementDocType.QUOTATION
                ? (latest?.version ?? 0) + 1
                : (latest?.version ?? 0) + 1;

        // For non-quotation single-slot docs, void prior active versions first
        if (dto.docType !== ProcurementDocType.QUOTATION && latest) {
            await this.prisma.procurementDocument.updateMany({
                where: {
                    contractId,
                    docType: dto.docType,
                    voidedAt: null,
                },
                data: {
                    voidedAt: new Date(),
                    voidReason: 'Superseded by newer version',
                    voidedById: ctx.user_id,
                },
            });
        }

        const data: Prisma.ProcurementDocumentCreateInput = {
            municipality: { connect: { id: ctx.municipality_id } },
            barangay: { connect: { id: ctx.barangay_id! } },
            contract: { connect: { id: contractId } },
            uploadedBy: { connect: { id: ctx.user_id } },
            docType: dto.docType,
            title: dto.title.trim(),
            notes: dto.notes?.trim(),
            version,
            fileKey:
                dto.docType === ProcurementDocType.QUOTATION
                    ? dto.quotationFileKey ?? null
                    : dto.fileKey!,
            fileName:
                dto.docType === ProcurementDocType.QUOTATION ? dto.fileName ?? null : dto.fileName!,
            mimeType:
                dto.docType === ProcurementDocType.QUOTATION ? dto.mimeType ?? null : dto.mimeType!,
            fileSizeBytes:
                dto.docType === ProcurementDocType.QUOTATION
                    ? dto.fileSizeBytes ?? null
                    : dto.fileSizeBytes!,
            contentSha256: dto.contentSha256 ?? null,
            quotationSupplierName:
                dto.docType === ProcurementDocType.QUOTATION
                    ? dto.quotationSupplierName!.trim()
                    : null,
            quotationAmountCentavos:
                dto.docType === ProcurementDocType.QUOTATION
                    ? BigInt(dto.quotationAmountCentavos!)
                    : null,
        };

        const row = await this.prisma.procurementDocument.create({ data });

        await this.auditLog.record({
            ctx,
            action: 'procurement.document.create',
            entityType: 'ProcurementDocument',
            entityId: row.id,
            barangayId: contract.barangayId,
            after: serializeBigInt(row) as object,
        });

        return serializeBigInt(row);
    }

    async voidDocument(
        ctx: TenantContext,
        contractId: string,
        docId: string,
        dto: VoidProcurementDocumentDto,
    ) {
        this.tenantScope.assertBarangayScope(ctx);
        const contract = await this.requireContract(ctx, contractId);

        if (contract.status === ContractStatus.COMPLETED) {
            throw new BadRequestException('Cannot void documents after completion');
        }

        const row = await this.prisma.procurementDocument.findFirst({
            where: {
                id: docId,
                contractId,
                municipalityId: ctx.municipality_id,
                barangayId: ctx.barangay_id!,
            },
        });
        if (!row) {
            throw new ForbiddenException('Document not found in your tenant scope');
        }

        if (POST_AWARD_STATUSES.includes(contract.status) && !isPostAwardDocType(row.docType)) {
            throw new BadRequestException(
                'Award-chain documents cannot be voided after award',
            );
        }

        if (row.voidedAt) {
            throw new BadRequestException('Document is already voided');
        }

        const updated = await this.prisma.procurementDocument.update({
            where: { id: docId },
            data: {
                voidedAt: new Date(),
                voidReason: dto.reason.trim(),
                voidedById: ctx.user_id,
            },
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.document.void',
            entityType: 'ProcurementDocument',
            entityId: docId,
            barangayId: contract.barangayId,
            after: { voidReason: dto.reason.trim() },
        });

        return serializeBigInt(updated);
    }

    async assertCanAdvance(
        contractId: string,
        targetStatus: ContractStatus,
        mode: import('@prisma/client').ProcurementMode,
    ) {
        const active = await this.activeDocSummaries(contractId);
        const requirements = requirementsForTargetStatus(
            targetStatus,
            mode,
            DEFAULT_MIN_QUOTATIONS,
        );
        const evaluation = evaluateChain(active, requirements);
        if (!evaluation.ok) {
            throw new BadRequestException(
                `Document chain incomplete for ${targetStatus}: missing ${evaluation.missingLabels.join(', ')}`,
            );
        }
    }

    private async activeDocSummaries(contractId: string) {
        const rows = await this.prisma.procurementDocument.findMany({
            where: { contractId, voidedAt: null },
            select: { docType: true, quotationSupplierName: true },
        });

        const counts = new Map<string, number>();
        const quoteSuppliers = new Set<string>();

        for (const row of rows) {
            if (row.docType === ProcurementDocType.QUOTATION) {
                if (row.quotationSupplierName) {
                    quoteSuppliers.add(normalizeSupplierName(row.quotationSupplierName));
                }
                continue;
            }
            counts.set(row.docType, (counts.get(row.docType) ?? 0) + 1);
        }

        const summaries = [...counts.entries()].map(([docType, activeCount]) => ({
            docType: docType as import('@prisma/client').ProcurementDocType,
            activeCount,
        }));

        if (quoteSuppliers.size > 0 || rows.some((r) => r.docType === ProcurementDocType.QUOTATION)) {
            summaries.push({
                docType: ProcurementDocType.QUOTATION,
                activeCount: quoteSuppliers.size,
            });
        }

        return summaries;
    }

    private async requireContract(ctx: TenantContext, contractId: string) {
        const row = await this.prisma.procurementContract.findFirst({
            where: {
                id: contractId,
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
            },
        });
        if (!row) {
            throw new ForbiddenException('Contract not found in your tenant scope');
        }
        return row;
    }
}
