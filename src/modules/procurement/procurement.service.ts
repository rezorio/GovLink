import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import {
    AppLineStatus,
    ContractStatus,
    ProcurementMode,
} from '@prisma/client';
import { TenantContext } from '../common/interfaces/auth.interface';
import { AuditLogService } from '../common/services/audit-log.service';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { PrismaService } from '../prisma/prisma.module';
import {
    AdvanceContractDto,
    CreateAppLineDto,
    CreateContractDto,
    UpdateAppLineDto,
} from './dto/procurement.dto';
import { CONTRACT_STATUS_FLOW } from './documents/document-chain.util';
import { ProcurementDocumentsService } from './documents/procurement-documents.service';
import { BacService } from './bac/bac.service';
import { assessSplittingRisk, normalizeSupplierName } from './splitting.util';
import { ThresholdsService } from './thresholds.service';

const appLineInclude = {
    barangay: { select: { id: true, name: true, psgcCode: true } },
} as const;

const contractInclude = {
    barangay: { select: { id: true, name: true, psgcCode: true } },
    appLineItem: {
        select: {
            id: true,
            code: true,
            description: true,
            category: true,
            approvedAmountCentavos: true,
            status: true,
        },
    },
} as const;

const STATUS_FLOW = CONTRACT_STATUS_FLOW;

function serializeBigInt<T>(value: T): T {
    return JSON.parse(
        JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)),
    ) as T;
}

@Injectable()
export class ProcurementService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
        private readonly auditLog: AuditLogService,
        private readonly thresholds: ThresholdsService,
        private readonly documents: ProcurementDocumentsService,
        private readonly bac: BacService,
    ) {}

    listThresholds() {
        return this.thresholds.listAll().then(serializeBigInt);
    }

    async listAppLines(ctx: TenantContext, fiscalYear?: number) {
        const rows = await this.prisma.appLineItem.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
                ...(fiscalYear ? { fiscalYear } : {}),
            },
            include: appLineInclude,
            orderBy: [{ fiscalYear: 'desc' }, { code: 'asc' }],
        });
        return serializeBigInt(rows);
    }

    async createAppLine(ctx: TenantContext, dto: CreateAppLineDto) {
        this.tenantScope.assertBarangayScope(ctx);

        const row = await this.prisma.appLineItem.create({
            data: {
                municipalityId: ctx.municipality_id,
                barangayId: ctx.barangay_id!,
                fiscalYear: dto.fiscalYear,
                code: dto.code.trim(),
                description: dto.description.trim(),
                category: dto.category.trim(),
                approvedAmountCentavos: BigInt(dto.approvedAmountCentavos),
                status: AppLineStatus.DRAFT,
            },
            include: appLineInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.app_line.create',
            entityType: 'AppLineItem',
            entityId: row.id,
            after: serializeBigInt(row) as object,
        });

        return serializeBigInt(row);
    }

    async updateAppLine(ctx: TenantContext, id: string, dto: UpdateAppLineDto) {
        this.tenantScope.assertBarangayScope(ctx);
        const existing = await this.findAppLineOrThrow(ctx, id);

        if (existing.status !== AppLineStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT APP lines can be updated');
        }

        const row = await this.prisma.appLineItem.update({
            where: { id },
            data: {
                ...(dto.description !== undefined
                    ? { description: dto.description.trim() }
                    : {}),
                ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
                ...(dto.approvedAmountCentavos !== undefined
                    ? { approvedAmountCentavos: BigInt(dto.approvedAmountCentavos) }
                    : {}),
            },
            include: appLineInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.app_line.update',
            entityType: 'AppLineItem',
            entityId: row.id,
            before: serializeBigInt(existing) as object,
            after: serializeBigInt(row) as object,
        });

        return serializeBigInt(row);
    }

    async approveAppLine(ctx: TenantContext, id: string) {
        this.tenantScope.assertMunicipalScope(ctx);
        const existing = await this.findAppLineOrThrow(ctx, id);
        if (existing.status === AppLineStatus.APPROVED) {
            return serializeBigInt(existing);
        }
        if (existing.status !== AppLineStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT APP lines can be approved');
        }

        const row = await this.prisma.appLineItem.update({
            where: { id },
            data: { status: AppLineStatus.APPROVED },
            include: appLineInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.app_line.approve',
            entityType: 'AppLineItem',
            entityId: row.id,
            barangayId: row.barangayId,
            after: { status: AppLineStatus.APPROVED },
        });

        return serializeBigInt(row);
    }

    async listContracts(ctx: TenantContext, fiscalYear?: number) {
        const rows = await this.prisma.procurementContract.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
                ...(fiscalYear ? { fiscalYear } : {}),
            },
            include: contractInclude,
            orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
        });
        return serializeBigInt(rows);
    }

    async findContract(ctx: TenantContext, id: string) {
        const row = await this.findContractOrThrow(ctx, id);
        return serializeBigInt(row);
    }

    async createContract(ctx: TenantContext, dto: CreateContractDto) {
        this.tenantScope.assertBarangayScope(ctx);

        const appLine = await this.findAppLineOrThrow(ctx, dto.appLineItemId);
        if (appLine.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('APP line belongs to another barangay');
        }
        if (appLine.status !== AppLineStatus.APPROVED) {
            throw new BadRequestException('Contracts require an APPROVED APP line');
        }

        const amount = BigInt(dto.amountCentavos);
        await this.assertWithinAppRemaining(appLine.id, appLine.approvedAmountCentavos, amount);

        const municipality = await this.prisma.municipality.findUniqueOrThrow({
            where: { id: ctx.municipality_id },
            select: { incomeClass: true, procurementRegime: true },
        });

        const modeMax = await this.thresholds.requireMaxAmountCentavos({
            regime: municipality.procurementRegime,
            incomeClass: municipality.incomeClass,
            mode: dto.mode,
        });

        if (dto.mode !== ProcurementMode.COMPETITIVE_BIDDING && amount > modeMax) {
            throw new BadRequestException(
                `Amount exceeds ${dto.mode} ceiling (${modeMax.toString()} centavos) for this LGU class`,
            );
        }

        const svpMax = await this.thresholds.requireMaxAmountCentavos({
            regime: municipality.procurementRegime,
            incomeClass: municipality.incomeClass,
            mode: ProcurementMode.SVP,
        });

        const peers = await this.prisma.procurementContract.findMany({
            where: {
                barangayId: ctx.barangay_id!,
                fiscalYear: appLine.fiscalYear,
                category: appLine.category,
            },
            select: { supplierName: true, amountCentavos: true },
        });

        const normalized = normalizeSupplierName(dto.supplierName);
        const peerAmounts = peers
            .filter((p) => normalizeSupplierName(p.supplierName) === normalized)
            .map((p) => p.amountCentavos);

        const split = assessSplittingRisk({
            existingAmountsCentavos: peerAmounts,
            newAmountCentavos: amount,
            svpMaxCentavos: svpMax,
        });

        const row = await this.prisma.procurementContract.create({
            data: {
                municipalityId: ctx.municipality_id,
                barangayId: ctx.barangay_id!,
                appLineItemId: appLine.id,
                title: dto.title.trim(),
                supplierName: dto.supplierName.trim(),
                amountCentavos: amount,
                mode: dto.mode,
                status: ContractStatus.DRAFT,
                fiscalYear: appLine.fiscalYear,
                category: appLine.category,
                splittingFlagged: split.flagged,
                splittingRiskScore: split.riskScore,
            },
            include: contractInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.contract.create',
            entityType: 'ProcurementContract',
            entityId: row.id,
            after: serializeBigInt(row) as object,
        });

        return serializeBigInt(row);
    }

    async advanceContract(ctx: TenantContext, id: string, dto: AdvanceContractDto) {
        this.tenantScope.assertBarangayScope(ctx);
        const existing = await this.findContractOrThrow(ctx, id);

        const next = STATUS_FLOW[existing.status];
        if (!next || next !== dto.targetStatus) {
            throw new BadRequestException(
                `Cannot advance from ${existing.status} to ${dto.targetStatus}`,
            );
        }

        if (dto.targetStatus === ContractStatus.AWARD_RECOMMENDED) {
            await this.bac.assertRosterReady(existing.barangayId);
        }

        if (dto.targetStatus === ContractStatus.AWARDED) {
            if (existing.splittingFlagged && !existing.splittingAcknowledgedAt) {
                throw new BadRequestException(
                    'Contract is flagged for possible splitting; municipal acknowledgment required before award',
                );
            }
        }

        await this.documents.assertCanAdvance(id, dto.targetStatus, existing.mode);

        const row = await this.prisma.procurementContract.update({
            where: { id },
            data: { status: dto.targetStatus },
            include: contractInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.contract.advance',
            entityType: 'ProcurementContract',
            entityId: row.id,
            before: { status: existing.status },
            after: { status: row.status },
        });

        return serializeBigInt(row);
    }

    async acknowledgeSplit(ctx: TenantContext, id: string) {
        this.tenantScope.assertMunicipalScope(ctx);
        const existing = await this.findContractOrThrow(ctx, id);

        if (!existing.splittingFlagged) {
            throw new BadRequestException('Contract is not flagged for splitting');
        }

        const row = await this.prisma.procurementContract.update({
            where: { id },
            data: {
                splittingAcknowledgedAt: new Date(),
                splittingAcknowledgedById: ctx.user_id,
            },
            include: contractInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'procurement.contract.acknowledge_split',
            entityType: 'ProcurementContract',
            entityId: row.id,
            after: {
                splittingAcknowledgedAt: row.splittingAcknowledgedAt,
            },
        });

        return serializeBigInt(row);
    }

    async oversight(ctx: TenantContext, fiscalYear?: number) {
        this.tenantScope.assertMunicipalScope(ctx);

        const year = fiscalYear ?? new Date().getFullYear();
        const [contracts, appLines, flagged] = await Promise.all([
            this.prisma.procurementContract.findMany({
                where: { municipalityId: ctx.municipality_id, fiscalYear: year },
                include: contractInclude,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.appLineItem.findMany({
                where: { municipalityId: ctx.municipality_id, fiscalYear: year },
                select: { id: true, approvedAmountCentavos: true },
            }),
            this.prisma.procurementContract.findMany({
                where: {
                    municipalityId: ctx.municipality_id,
                    fiscalYear: year,
                    splittingFlagged: true,
                    splittingAcknowledgedAt: null,
                },
                include: contractInclude,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const totalContractCentavos = contracts.reduce(
            (sum, c) => sum + c.amountCentavos,
            0n,
        );
        const totalAppCentavos = appLines.reduce(
            (sum, a) => sum + a.approvedAmountCentavos,
            0n,
        );
        const linkedCount = contracts.length;
        const appComplianceRate =
            appLines.length === 0
                ? null
                : Math.round(
                      (new Set(contracts.map((c) => c.appLineItemId)).size /
                          appLines.length) *
                          1000,
                  ) / 10;

        return serializeBigInt({
            fiscalYear: year,
            sglgPillar: 'FINANCIAL_ADMINISTRATION',
            totals: {
                appLineCount: appLines.length,
                contractCount: linkedCount,
                totalAppCentavos: totalAppCentavos.toString(),
                totalContractCentavos: totalContractCentavos.toString(),
                appComplianceRate,
                pendingSplitFlags: flagged.length,
            },
            flaggedContracts: flagged,
            contracts,
        });
    }

    private async findAppLineOrThrow(ctx: TenantContext, id: string) {
        const row = await this.prisma.appLineItem.findFirst({
            where: {
                id,
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
            },
            include: appLineInclude,
        });
        if (!row) {
            throw new ForbiddenException('APP line not found in your tenant scope');
        }
        return row;
    }

    private async findContractOrThrow(ctx: TenantContext, id: string) {
        const row = await this.prisma.procurementContract.findFirst({
            where: {
                id,
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
            },
            include: contractInclude,
        });
        if (!row) {
            throw new ForbiddenException('Contract not found in your tenant scope');
        }
        return row;
    }

    private async assertWithinAppRemaining(
        appLineId: string,
        approved: bigint,
        newAmount: bigint,
    ) {
        const used = await this.prisma.procurementContract.aggregate({
            where: {
                appLineItemId: appLineId,
            },
            _sum: { amountCentavos: true },
        });
        const committed = used._sum.amountCentavos ?? 0n;
        if (committed + newAmount > approved) {
            throw new BadRequestException(
                `Amount exceeds remaining APP line budget (${(approved - committed).toString()} centavos left)`,
            );
        }
    }
}
