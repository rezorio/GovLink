import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    NotificationKind,
    PlanSubmissionStatus,
    PlanType,
} from '@prisma/client';
import { TenantContext } from '../common/interfaces/auth.interface';
import { AuditLogService } from '../common/services/audit-log.service';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { assertTenantFileKey } from '../common/utils/file-key.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import { OpenPlanPeriodsDto, ReviewPlanDto, UpdatePlanDto } from './dto/plan.dto';
import { periodForPlanType, planTypeLabel } from './plan-period.util';

const planInclude = {
    barangay: { select: { id: true, name: true, psgcCode: true } },
} as const;

@Injectable()
export class PlansService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
        private readonly auditLog: AuditLogService,
        private readonly notifications: NotificationsService,
    ) {}

    list(ctx: TenantContext, planType?: PlanType, periodLabel?: string) {
        return this.prisma.planSubmission.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
                ...(planType ? { planType } : {}),
                ...(periodLabel ? { periodLabel } : {}),
            },
            include: planInclude,
            orderBy: [{ planType: 'asc' }, { periodLabel: 'desc' }, { updatedAt: 'desc' }],
        });
    }

    async matrix(ctx: TenantContext, planType?: PlanType, periodLabel?: string) {
        this.tenantScope.assertMunicipalScope(ctx);

        const types = planType ? [planType] : [PlanType.BDP, PlanType.AIP];
        const periods = types.map((t) => ({
            planType: t,
            ...(periodLabel
                ? { periodLabel, dueDate: periodForPlanType(t).dueDate }
                : periodForPlanType(t)),
        }));

        const [barangays, rows] = await Promise.all([
            this.prisma.barangay.findMany({
                where: { municipalityId: ctx.municipality_id, isActive: true },
                select: { id: true, name: true, psgcCode: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.planSubmission.findMany({
                where: {
                    municipalityId: ctx.municipality_id,
                    OR: periods.map((p) => ({
                        planType: p.planType,
                        periodLabel: p.periodLabel,
                    })),
                },
                select: {
                    id: true,
                    barangayId: true,
                    planType: true,
                    periodLabel: true,
                    dueDate: true,
                    status: true,
                    title: true,
                    submittedAt: true,
                    returnReason: true,
                },
            }),
        ]);

        const statusCounts = {
            notStarted: 0,
            draft: 0,
            submitted: 0,
            accepted: 0,
            returned: 0,
        };
        for (const row of rows) {
            switch (row.status) {
                case PlanSubmissionStatus.NOT_STARTED:
                    statusCounts.notStarted += 1;
                    break;
                case PlanSubmissionStatus.DRAFT:
                    statusCounts.draft += 1;
                    break;
                case PlanSubmissionStatus.SUBMITTED:
                    statusCounts.submitted += 1;
                    break;
                case PlanSubmissionStatus.ACCEPTED:
                    statusCounts.accepted += 1;
                    break;
                case PlanSubmissionStatus.RETURNED:
                    statusCounts.returned += 1;
                    break;
            }
        }

        return {
            periods: periods.map((p) => ({
                planType: p.planType,
                periodLabel: p.periodLabel,
                label: planTypeLabel(p.planType),
            })),
            barangays,
            cells: rows,
            statusCounts,
        };
    }

    async openPeriods(ctx: TenantContext, dto: OpenPlanPeriodsDto) {
        this.tenantScope.assertMunicipalScope(ctx);

        const types = dto.planType ? [dto.planType] : [PlanType.BDP, PlanType.AIP];
        const barangays = await this.prisma.barangay.findMany({
            where: { municipalityId: ctx.municipality_id, isActive: true },
            select: { id: true },
        });

        let created = 0;
        let skipped = 0;

        for (const type of types) {
            const period = dto.periodLabel
                ? { periodLabel: dto.periodLabel, dueDate: periodForPlanType(type).dueDate }
                : periodForPlanType(type);

            for (const brgy of barangays) {
                try {
                    await this.prisma.planSubmission.create({
                        data: {
                            municipalityId: ctx.municipality_id,
                            barangayId: brgy.id,
                            planType: type,
                            periodLabel: period.periodLabel,
                            dueDate: period.dueDate,
                            status: PlanSubmissionStatus.NOT_STARTED,
                            title: planTypeLabel(type),
                        },
                    });
                    created += 1;
                } catch {
                    skipped += 1;
                }
            }
        }

        await this.auditLog.record({
            ctx,
            action: 'PLAN_PERIODS_OPENED',
            entityType: 'PlanSubmission',
            entityId: ctx.municipality_id,
            after: { created, skipped, types },
        });

        return { created, skipped };
    }

    async findOne(ctx: TenantContext, id: string) {
        const row = await this.prisma.planSubmission.findFirst({
            where: {
                id,
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
            },
            include: planInclude,
        });
        if (!row) {
            throw new NotFoundException('Plan submission not found');
        }
        if (ctx.barangay_id && row.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('Access denied for this barangay plan');
        }
        return row;
    }

    async updateDraft(ctx: TenantContext, id: string, dto: UpdatePlanDto) {
        this.tenantScope.assertBarangayScope(ctx);
        const existing = await this.findOne(ctx, id);

        if (
            existing.status !== PlanSubmissionStatus.NOT_STARTED &&
            existing.status !== PlanSubmissionStatus.DRAFT &&
            existing.status !== PlanSubmissionStatus.RETURNED
        ) {
            throw new BadRequestException('Plan cannot be edited in current status');
        }

        if (dto.fileKey) {
            assertTenantFileKey(ctx, dto.fileKey, 'plans');
        }

        const updated = await this.prisma.planSubmission.update({
            where: { id: existing.id },
            data: {
                status:
                    existing.status === PlanSubmissionStatus.NOT_STARTED
                        ? PlanSubmissionStatus.DRAFT
                        : existing.status === PlanSubmissionStatus.RETURNED
                          ? PlanSubmissionStatus.DRAFT
                          : existing.status,
                title: dto.title?.trim() ?? existing.title,
                notes: dto.notes !== undefined ? dto.notes : existing.notes,
                fileKey: dto.fileKey ?? existing.fileKey,
                fileName: dto.fileName ?? existing.fileName,
                returnReason: null,
            },
            include: planInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'PLAN_DRAFT_UPDATED',
            entityType: 'PlanSubmission',
            entityId: updated.id,
            barangayId: updated.barangayId,
            after: { status: updated.status, title: updated.title },
        });

        return updated;
    }

    async submit(ctx: TenantContext, id: string) {
        this.tenantScope.assertBarangayScope(ctx);
        const existing = await this.findOne(ctx, id);

        if (
            existing.status !== PlanSubmissionStatus.DRAFT &&
            existing.status !== PlanSubmissionStatus.RETURNED &&
            existing.status !== PlanSubmissionStatus.NOT_STARTED
        ) {
            throw new BadRequestException('Plan is not ready to submit');
        }

        const updated = await this.prisma.planSubmission.update({
            where: { id: existing.id },
            data: {
                status: PlanSubmissionStatus.SUBMITTED,
                submittedAt: new Date(),
                submittedById: ctx.user_id,
                reviewedAt: null,
                reviewedById: null,
                returnReason: null,
                title: existing.title ?? planTypeLabel(existing.planType),
            },
            include: planInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'PLAN_SUBMITTED',
            entityType: 'PlanSubmission',
            entityId: updated.id,
            barangayId: updated.barangayId,
            after: { status: updated.status, planType: updated.planType },
        });

        await this.notifications.notifyMunicipalUsers({
            municipalityId: ctx.municipality_id,
            barangayId: updated.barangayId,
            kind: NotificationKind.PLAN_SUBMITTED,
            title: `${updated.planType} submitted`,
            body: `${updated.barangay.name} submitted ${planTypeLabel(updated.planType)} (${updated.periodLabel}).`,
            entityType: 'PlanSubmission',
            entityId: updated.id,
            href: '/mayor/plans',
            excludeUserId: ctx.user_id,
        });

        return updated;
    }

    async review(ctx: TenantContext, id: string, dto: ReviewPlanDto) {
        this.tenantScope.assertMunicipalScope(ctx);
        const existing = await this.findOne(ctx, id);

        if (existing.status !== PlanSubmissionStatus.SUBMITTED) {
            throw new BadRequestException('Plan has no submission pending review');
        }
        if (dto.decision === 'RETURNED' && !dto.returnReason?.trim()) {
            throw new BadRequestException('returnReason is required when returning a plan');
        }

        const nextStatus =
            dto.decision === 'ACCEPTED'
                ? PlanSubmissionStatus.ACCEPTED
                : PlanSubmissionStatus.RETURNED;

        const updated = await this.prisma.planSubmission.update({
            where: { id: existing.id },
            data: {
                status: nextStatus,
                reviewedAt: new Date(),
                reviewedById: ctx.user_id,
                returnReason: dto.decision === 'RETURNED' ? dto.returnReason!.trim() : null,
            },
            include: planInclude,
        });

        await this.auditLog.record({
            ctx,
            action: dto.decision === 'ACCEPTED' ? 'PLAN_ACCEPTED' : 'PLAN_RETURNED',
            entityType: 'PlanSubmission',
            entityId: updated.id,
            barangayId: updated.barangayId,
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
            kind: accepted ? NotificationKind.PLAN_ACCEPTED : NotificationKind.PLAN_RETURNED,
            title: accepted ? `${updated.planType} accepted` : `${updated.planType} returned`,
            body: accepted
                ? `Municipal LDC accepted your ${planTypeLabel(updated.planType)}.`
                : `Municipal review returned your ${planTypeLabel(updated.planType)} for correction.`,
            entityType: 'PlanSubmission',
            entityId: updated.id,
            href: '/barangay/plans',
            excludeUserId: ctx.user_id,
        });

        return updated;
    }
}
