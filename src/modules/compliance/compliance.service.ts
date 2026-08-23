import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    ComplianceScope,
    ComplianceStatus,
    NotificationKind,
    Prisma,
} from '@prisma/client';
import { TenantContext } from '../common/interfaces/auth.interface';
import { AuditLogService } from '../common/services/audit-log.service';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { OpenPeriodDto } from './dto/open-period.dto';
import {
    CreateComplianceRequirementDto,
    UpdateComplianceRequirementDto,
} from './dto/requirement.dto';
import { ReviewComplianceInstanceDto } from './dto/review-instance.dto';
import {
    currentPeriodForFrequency,
    effectiveComplianceStatus,
} from './period.util';

const instanceInclude = {
    barangay: { select: { id: true, name: true, psgcCode: true } },
    requirement: {
        select: {
            id: true,
            code: true,
            title: true,
            frequency: true,
            category: true,
            weight: true,
        },
    },
} as const;

@Injectable()
export class ComplianceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
        private readonly auditLog: AuditLogService,
        private readonly notifications: NotificationsService,
    ) {}

    listRequirements(ctx: TenantContext, scope?: ComplianceScope) {
        return this.prisma.complianceRequirement.findMany({
            where: this.catalogWhere(ctx, scope),
            orderBy: [{ category: 'asc' }, { code: 'asc' }],
        });
    }

    async createRequirement(ctx: TenantContext, dto: CreateComplianceRequirementDto) {
        this.tenantScope.assertMunicipalScope(ctx);

        const code = dto.code.trim().toUpperCase();
        const existing = await this.prisma.complianceRequirement.findUnique({ where: { code } });
        if (existing) {
            throw new ConflictException(`Requirement code ${code} already exists`);
        }

        const created = await this.prisma.complianceRequirement.create({
            data: {
                municipalityId: ctx.municipality_id,
                code,
                title: dto.title.trim(),
                legalBasis: dto.legalBasis.trim(),
                category: dto.category,
                frequency: dto.frequency,
                evidenceTypes: dto.evidenceTypes.map((item) => item.trim()).filter(Boolean),
                weight: dto.weight ?? 1,
                scope: dto.scope ?? ComplianceScope.BARANGAY,
                sglgPillar: dto.sglgPillar,
                isActive: true,
            },
        });

        await this.auditLog.record({
            ctx,
            action: 'COMPLIANCE_REQUIREMENT_CREATED',
            entityType: 'ComplianceRequirement',
            entityId: created.id,
            after: { code: created.code, category: created.category },
        });

        return created;
    }

    async updateRequirement(
        ctx: TenantContext,
        id: string,
        dto: UpdateComplianceRequirementDto,
    ) {
        this.tenantScope.assertMunicipalScope(ctx);

        const existing = await this.prisma.complianceRequirement.findFirst({
            where: { id, municipalityId: ctx.municipality_id },
        });
        if (!existing) {
            throw new NotFoundException(
                'Requirement not found, or it is a system catalog item (read-only)',
            );
        }

        const updated = await this.prisma.complianceRequirement.update({
            where: { id },
            data: {
                ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
                ...(dto.legalBasis !== undefined ? { legalBasis: dto.legalBasis.trim() } : {}),
                ...(dto.category !== undefined ? { category: dto.category } : {}),
                ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
                ...(dto.evidenceTypes !== undefined
                    ? {
                          evidenceTypes: dto.evidenceTypes
                              .map((item) => item.trim())
                              .filter(Boolean),
                      }
                    : {}),
                ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
                ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
                ...(dto.sglgPillar !== undefined ? { sglgPillar: dto.sglgPillar } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
        });

        await this.auditLog.record({
            ctx,
            action: 'COMPLIANCE_REQUIREMENT_UPDATED',
            entityType: 'ComplianceRequirement',
            entityId: updated.id,
            before: { code: existing.code, isActive: existing.isActive },
            after: { code: updated.code, isActive: updated.isActive },
        });

        return updated;
    }

    async deactivateRequirement(ctx: TenantContext, id: string) {
        return this.updateRequirement(ctx, id, { isActive: false });
    }

    async listInstances(ctx: TenantContext, periodLabel?: string) {
        const rows = await this.prisma.complianceInstance.findMany({
            where: {
                ...this.tenantFilter(ctx),
                ...(periodLabel ? { periodLabel } : {}),
            },
            include: instanceInclude,
            orderBy: [
                { barangay: { name: 'asc' } },
                { requirement: { code: 'asc' } },
            ],
        });

        return rows.map((row) => this.withEffectiveStatus(row));
    }

    async matrix(ctx: TenantContext, periodLabel?: string) {
        this.tenantScope.assertMunicipalScope(ctx);

        const [barangays, requirements, instances] = await Promise.all([
            this.prisma.barangay.findMany({
                where: { municipalityId: ctx.municipality_id, isActive: true },
                select: { id: true, name: true, psgcCode: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.complianceRequirement.findMany({
                where: this.catalogWhere(ctx, ComplianceScope.BARANGAY),
                select: {
                    id: true,
                    code: true,
                    title: true,
                    frequency: true,
                    category: true,
                },
                orderBy: { code: 'asc' },
            }),
            this.prisma.complianceInstance.findMany({
                where: {
                    municipalityId: ctx.municipality_id,
                    ...(periodLabel ? { periodLabel } : {}),
                },
                select: {
                    id: true,
                    barangayId: true,
                    requirementId: true,
                    periodLabel: true,
                    dueDate: true,
                    status: true,
                },
            }),
        ]);

        const cells = instances.map((row) => ({
            id: row.id,
            barangayId: row.barangayId,
            requirementId: row.requirementId,
            periodLabel: row.periodLabel,
            dueDate: row.dueDate,
            status: effectiveComplianceStatus(row.status, row.dueDate),
        }));

        const statusCounts = {
            notStarted: 0,
            inProgress: 0,
            submitted: 0,
            accepted: 0,
            overdue: 0,
            returned: 0,
        };

        for (const cell of cells) {
            switch (cell.status) {
                case ComplianceStatus.NOT_STARTED:
                    statusCounts.notStarted += 1;
                    break;
                case ComplianceStatus.IN_PROGRESS:
                    statusCounts.inProgress += 1;
                    break;
                case ComplianceStatus.SUBMITTED:
                case ComplianceStatus.UNDER_REVIEW:
                    statusCounts.submitted += 1;
                    break;
                case ComplianceStatus.ACCEPTED:
                    statusCounts.accepted += 1;
                    break;
                case ComplianceStatus.OVERDUE:
                    statusCounts.overdue += 1;
                    break;
                case ComplianceStatus.RETURNED:
                    statusCounts.returned += 1;
                    break;
            }
        }

        return { barangays, requirements, cells, statusCounts };
    }

    async openCurrentPeriods(ctx: TenantContext, dto: OpenPeriodDto) {
        this.tenantScope.assertMunicipalScope(ctx);

        const [barangays, requirements] = await Promise.all([
            this.prisma.barangay.findMany({
                where: { municipalityId: ctx.municipality_id, isActive: true },
                select: { id: true },
            }),
            this.prisma.complianceRequirement.findMany({
                where: this.catalogWhere(ctx, ComplianceScope.BARANGAY),
            }),
        ]);

        let created = 0;
        let skipped = 0;

        for (const requirement of requirements) {
            const period = currentPeriodForFrequency(requirement.frequency);
            if (!period) {
                continue;
            }
            if (dto.periodLabel && period.periodLabel !== dto.periodLabel) {
                continue;
            }

            for (const barangay of barangays) {
                try {
                    await this.prisma.complianceInstance.create({
                        data: {
                            municipalityId: ctx.municipality_id,
                            barangayId: barangay.id,
                            requirementId: requirement.id,
                            periodLabel: period.periodLabel,
                            dueDate: period.dueDate,
                            status: ComplianceStatus.NOT_STARTED,
                        },
                    });
                    created += 1;
                } catch (error) {
                    if (
                        error instanceof Prisma.PrismaClientKnownRequestError &&
                        error.code === 'P2002'
                    ) {
                        skipped += 1;
                        continue;
                    }
                    throw error;
                }
            }
        }

        await this.auditLog.record({
            ctx,
            action: 'COMPLIANCE_PERIOD_OPENED',
            entityType: 'ComplianceInstance',
            entityId: ctx.municipality_id,
            after: {
                periodLabel: dto.periodLabel ?? 'current-by-frequency',
                created,
                skipped,
            },
        });

        return { created, skipped };
    }

    async findOne(ctx: TenantContext, instanceId: string) {
        const row = await this.prisma.complianceInstance.findFirst({
            where: {
                id: instanceId,
                municipalityId: ctx.municipality_id,
            },
            include: instanceInclude,
        });

        if (!row) {
            throw new NotFoundException('Compliance instance not found');
        }

        if (ctx.barangay_id && row.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('Access denied for this barangay compliance item');
        }

        return this.withEffectiveStatus(row);
    }

    async reviewQueue(ctx: TenantContext) {
        this.tenantScope.assertMunicipalScope(ctx);

        const rows = await this.prisma.complianceInstance.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                status: {
                    in: [
                        ComplianceStatus.SUBMITTED,
                        ComplianceStatus.UNDER_REVIEW,
                        ComplianceStatus.RETURNED,
                    ],
                },
            },
            include: instanceInclude,
            orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
        });

        return rows.map((row) => this.withEffectiveStatus(row));
    }

    async start(ctx: TenantContext, instanceId: string) {
        this.tenantScope.assertBarangayScope(ctx);
        const stored = await this.loadStored(instanceId, ctx);

        if (
            stored.status !== ComplianceStatus.NOT_STARTED &&
            stored.status !== ComplianceStatus.RETURNED
        ) {
            throw new BadRequestException('Compliance item cannot be started from current status');
        }

        const before = { status: stored.status };
        const updated = await this.prisma.complianceInstance.update({
            where: { id: stored.id },
            data: {
                status: ComplianceStatus.IN_PROGRESS,
                returnReason: null,
            },
            include: instanceInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'COMPLIANCE_STARTED',
            entityType: 'ComplianceInstance',
            entityId: updated.id,
            barangayId: updated.barangayId,
            before,
            after: { status: updated.status },
        });

        return this.withEffectiveStatus(updated);
    }

    async submit(ctx: TenantContext, instanceId: string) {
        this.tenantScope.assertBarangayScope(ctx);
        const stored = await this.loadStored(instanceId, ctx);

        if (ctx.barangay_id && stored.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('Access denied for this barangay compliance item');
        }

        const submittable: ComplianceStatus[] = [
            ComplianceStatus.IN_PROGRESS,
            ComplianceStatus.RETURNED,
        ];
        if (!submittable.includes(stored.status)) {
            throw new BadRequestException('Compliance item is not ready to submit');
        }

        const before = { status: stored.status };
        const updated = await this.prisma.complianceInstance.update({
            where: { id: stored.id },
            data: {
                status: ComplianceStatus.SUBMITTED,
                submittedAt: new Date(),
                submittedById: ctx.user_id,
                returnReason: null,
                reviewedAt: null,
                reviewedById: null,
            },
            include: instanceInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'COMPLIANCE_SUBMITTED',
            entityType: 'ComplianceInstance',
            entityId: updated.id,
            barangayId: updated.barangayId,
            before,
            after: { status: updated.status, submittedAt: updated.submittedAt },
        });

        const barangayName = updated.barangay?.name ?? 'Barangay';
        await this.notifications.notifyMunicipalUsers({
            municipalityId: ctx.municipality_id,
            barangayId: updated.barangayId,
            kind: NotificationKind.COMPLIANCE_SUBMITTED,
            title: 'Compliance item submitted',
            body: `${barangayName} submitted ${updated.requirement.code}: ${updated.requirement.title}.`,
            entityType: 'ComplianceInstance',
            entityId: updated.id,
            href: '/mayor',
            excludeUserId: ctx.user_id,
        });

        return this.withEffectiveStatus(updated);
    }

    async review(ctx: TenantContext, instanceId: string, dto: ReviewComplianceInstanceDto) {
        this.tenantScope.assertMunicipalScope(ctx);
        const stored = await this.loadStored(instanceId, ctx);

        const reviewable: ComplianceStatus[] = [
            ComplianceStatus.SUBMITTED,
            ComplianceStatus.UNDER_REVIEW,
        ];
        if (!reviewable.includes(stored.status)) {
            throw new BadRequestException('Compliance item has no submission pending review');
        }

        if (dto.decision === 'RETURNED' && !dto.returnReason?.trim()) {
            throw new BadRequestException('returnReason is required when returning an item');
        }

        const nextStatus =
            dto.decision === 'ACCEPTED'
                ? ComplianceStatus.ACCEPTED
                : ComplianceStatus.RETURNED;

        const before = { status: stored.status };
        const updated = await this.prisma.complianceInstance.update({
            where: { id: stored.id },
            data: {
                status: nextStatus,
                reviewedAt: new Date(),
                reviewedById: ctx.user_id,
                returnReason:
                    dto.decision === 'RETURNED'
                        ? (dto.returnReason ?? dto.comment ?? null)
                        : null,
            },
            include: instanceInclude,
        });

        await this.auditLog.record({
            ctx,
            action:
                dto.decision === 'ACCEPTED'
                    ? 'COMPLIANCE_ACCEPTED'
                    : 'COMPLIANCE_RETURNED',
            entityType: 'ComplianceInstance',
            entityId: updated.id,
            barangayId: updated.barangayId,
            before,
            after: {
                status: updated.status,
                returnReason: updated.returnReason,
                comment: dto.comment ?? null,
            },
        });

        const accepted = dto.decision === 'ACCEPTED';
        await this.notifications.notifyBarangayUsers({
            municipalityId: ctx.municipality_id,
            barangayId: updated.barangayId,
            kind: accepted
                ? NotificationKind.COMPLIANCE_ACCEPTED
                : NotificationKind.COMPLIANCE_RETURNED,
            title: accepted ? 'Compliance accepted' : 'Compliance returned',
            body: accepted
                ? `Municipal review accepted ${updated.requirement.code}.`
                : `Municipal review returned ${updated.requirement.code} for correction.`,
            entityType: 'ComplianceInstance',
            entityId: updated.id,
            href: '/barangay/compliance',
            excludeUserId: ctx.user_id,
        });

        return this.withEffectiveStatus(updated);
    }

    private async loadStored(instanceId: string, ctx: TenantContext) {
        const row = await this.prisma.complianceInstance.findFirst({
            where: {
                id: instanceId,
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
            },
        });

        if (!row) {
            throw new NotFoundException('Compliance instance not found');
        }

        return row;
    }
    private catalogWhere(
        ctx: TenantContext,
        scope?: ComplianceScope,
    ): Prisma.ComplianceRequirementWhereInput {
        return {
            isActive: true,
            ...(scope ? { scope } : {}),
            OR: [{ municipalityId: null }, { municipalityId: ctx.municipality_id }],
        };
    }


    private tenantFilter(ctx: TenantContext) {
        return {
            municipalityId: ctx.municipality_id,
            ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
        };
    }

    private withEffectiveStatus<
        T extends { status: ComplianceStatus; dueDate: Date },
    >(row: T) {
        return {
            ...row,
            status: effectiveComplianceStatus(row.status, row.dueDate),
        };
    }
}
