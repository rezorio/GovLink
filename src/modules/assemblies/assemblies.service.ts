import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    AssemblySemester,
    AssemblySubmissionStatus,
    NotificationKind,
} from '@prisma/client';
import { TenantContext } from '../common/interfaces/auth.interface';
import { AuditLogService } from '../common/services/audit-log.service';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { assertTenantFileKey } from '../common/utils/file-key.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.module';
import {
    OpenAssemblyPeriodsDto,
    ReviewAssemblyDto,
    UpdateAssemblyDto,
} from './dto/assembly.dto';
import {
    allCurrentSemesters,
    periodForSemester,
    semesterLabel,
} from './assembly-period.util';

const assemblyInclude = {
    barangay: { select: { id: true, name: true, psgcCode: true } },
} as const;

@Injectable()
export class AssembliesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
        private readonly auditLog: AuditLogService,
        private readonly notifications: NotificationsService,
    ) {}

    list(ctx: TenantContext, semester?: AssemblySemester, periodLabel?: string) {
        return this.prisma.assemblySubmission.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
                ...(semester ? { semester } : {}),
                ...(periodLabel ? { periodLabel } : {}),
            },
            include: assemblyInclude,
            orderBy: [{ periodLabel: 'desc' }, { semester: 'asc' }, { updatedAt: 'desc' }],
        });
    }

    async matrix(ctx: TenantContext, semester?: AssemblySemester, periodLabel?: string) {
        this.tenantScope.assertMunicipalScope(ctx);

        const periods = semester
            ? [
                  {
                      semester,
                      ...(periodLabel
                          ? { periodLabel, dueDate: periodForSemester(semester).dueDate }
                          : periodForSemester(semester)),
                      label: semesterLabel(semester),
                  },
              ]
            : allCurrentSemesters().map((p) =>
                  periodLabel
                      ? {
                            semester: p.semester,
                            periodLabel,
                            dueDate: p.dueDate,
                            label: p.label,
                        }
                      : p,
              );

        const [barangays, rows] = await Promise.all([
            this.prisma.barangay.findMany({
                where: { municipalityId: ctx.municipality_id, isActive: true },
                select: { id: true, name: true, psgcCode: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.assemblySubmission.findMany({
                where: {
                    municipalityId: ctx.municipality_id,
                    OR: periods.map((p) => ({ periodLabel: p.periodLabel })),
                },
                select: {
                    id: true,
                    barangayId: true,
                    semester: true,
                    periodLabel: true,
                    dueDate: true,
                    status: true,
                    title: true,
                    heldAt: true,
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
                case AssemblySubmissionStatus.NOT_STARTED:
                    statusCounts.notStarted += 1;
                    break;
                case AssemblySubmissionStatus.DRAFT:
                    statusCounts.draft += 1;
                    break;
                case AssemblySubmissionStatus.SUBMITTED:
                    statusCounts.submitted += 1;
                    break;
                case AssemblySubmissionStatus.ACCEPTED:
                    statusCounts.accepted += 1;
                    break;
                case AssemblySubmissionStatus.RETURNED:
                    statusCounts.returned += 1;
                    break;
            }
        }

        return {
            periods: periods.map((p) => ({
                semester: p.semester,
                periodLabel: p.periodLabel,
                label: p.label,
            })),
            barangays,
            cells: rows,
            statusCounts,
        };
    }

    async openPeriods(ctx: TenantContext, dto: OpenAssemblyPeriodsDto) {
        this.tenantScope.assertMunicipalScope(ctx);

        const semesters = dto.semester
            ? [dto.semester]
            : [AssemblySemester.H1, AssemblySemester.H2];
        const barangays = await this.prisma.barangay.findMany({
            where: { municipalityId: ctx.municipality_id, isActive: true },
            select: { id: true },
        });

        let created = 0;
        let skipped = 0;

        for (const semester of semesters) {
            const period = dto.periodLabel
                ? { periodLabel: dto.periodLabel, dueDate: periodForSemester(semester).dueDate }
                : periodForSemester(semester);

            for (const brgy of barangays) {
                try {
                    await this.prisma.assemblySubmission.create({
                        data: {
                            municipalityId: ctx.municipality_id,
                            barangayId: brgy.id,
                            semester,
                            periodLabel: period.periodLabel,
                            dueDate: period.dueDate,
                            status: AssemblySubmissionStatus.NOT_STARTED,
                            title: semesterLabel(semester),
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
            action: 'ASSEMBLY_PERIODS_OPENED',
            entityType: 'AssemblySubmission',
            entityId: ctx.municipality_id,
            after: { created, skipped, semesters },
        });

        return { created, skipped };
    }

    async findOne(ctx: TenantContext, id: string) {
        const row = await this.prisma.assemblySubmission.findFirst({
            where: {
                id,
                municipalityId: ctx.municipality_id,
            },
            include: assemblyInclude,
        });
        if (!row) {
            throw new NotFoundException('Assembly submission not found');
        }
        if (ctx.barangay_id && row.barangayId !== ctx.barangay_id) {
            throw new ForbiddenException('Access denied for this barangay assembly');
        }
        return row;
    }

    async updateDraft(ctx: TenantContext, id: string, dto: UpdateAssemblyDto) {
        this.tenantScope.assertBarangayScope(ctx);
        const existing = await this.findOne(ctx, id);

        if (
            existing.status !== AssemblySubmissionStatus.NOT_STARTED &&
            existing.status !== AssemblySubmissionStatus.DRAFT &&
            existing.status !== AssemblySubmissionStatus.RETURNED
        ) {
            throw new BadRequestException('Assembly cannot be edited in current status');
        }

        if (dto.fileKey) {
            assertTenantFileKey(ctx, dto.fileKey, 'assemblies');
        }

        const updated = await this.prisma.assemblySubmission.update({
            where: { id: existing.id },
            data: {
                status:
                    existing.status === AssemblySubmissionStatus.NOT_STARTED
                        ? AssemblySubmissionStatus.DRAFT
                        : existing.status === AssemblySubmissionStatus.RETURNED
                          ? AssemblySubmissionStatus.DRAFT
                          : existing.status,
                title: dto.title?.trim() ?? existing.title,
                notes: dto.notes !== undefined ? dto.notes : existing.notes,
                heldAt: dto.heldAt !== undefined ? new Date(dto.heldAt) : existing.heldAt,
                venue: dto.venue !== undefined ? dto.venue.trim() || null : existing.venue,
                attendanceCount:
                    dto.attendanceCount !== undefined
                        ? dto.attendanceCount
                        : existing.attendanceCount,
                fileKey: dto.fileKey ?? existing.fileKey,
                fileName: dto.fileName ?? existing.fileName,
                returnReason: null,
            },
            include: assemblyInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'ASSEMBLY_DRAFT_UPDATED',
            entityType: 'AssemblySubmission',
            entityId: updated.id,
            barangayId: updated.barangayId,
            after: {
                status: updated.status,
                heldAt: updated.heldAt,
                attendanceCount: updated.attendanceCount,
            },
        });

        return updated;
    }

    async submit(ctx: TenantContext, id: string) {
        this.tenantScope.assertBarangayScope(ctx);
        const existing = await this.findOne(ctx, id);

        if (
            existing.status !== AssemblySubmissionStatus.DRAFT &&
            existing.status !== AssemblySubmissionStatus.RETURNED &&
            existing.status !== AssemblySubmissionStatus.NOT_STARTED
        ) {
            throw new BadRequestException('Assembly is not ready to submit');
        }

        const updated = await this.prisma.assemblySubmission.update({
            where: { id: existing.id },
            data: {
                status: AssemblySubmissionStatus.SUBMITTED,
                submittedAt: new Date(),
                submittedById: ctx.user_id,
                reviewedAt: null,
                reviewedById: null,
                returnReason: null,
                title: existing.title ?? semesterLabel(existing.semester),
            },
            include: assemblyInclude,
        });

        await this.auditLog.record({
            ctx,
            action: 'ASSEMBLY_SUBMITTED',
            entityType: 'AssemblySubmission',
            entityId: updated.id,
            barangayId: updated.barangayId,
            after: { status: updated.status, periodLabel: updated.periodLabel },
        });

        await this.notifications.notifyMunicipalUsers({
            municipalityId: ctx.municipality_id,
            barangayId: updated.barangayId,
            kind: NotificationKind.ASSEMBLY_SUBMITTED,
            title: 'Barangay assembly submitted',
            body: `${updated.barangay.name} submitted ${semesterLabel(updated.semester)} (${updated.periodLabel}).`,
            entityType: 'AssemblySubmission',
            entityId: updated.id,
            href: '/mayor/assemblies',
            excludeUserId: ctx.user_id,
        });

        return updated;
    }

    async review(ctx: TenantContext, id: string, dto: ReviewAssemblyDto) {
        this.tenantScope.assertMunicipalScope(ctx);
        const existing = await this.findOne(ctx, id);

        if (existing.status !== AssemblySubmissionStatus.SUBMITTED) {
            throw new BadRequestException('Assembly has no submission pending review');
        }
        if (dto.decision === 'RETURNED' && !dto.returnReason?.trim()) {
            throw new BadRequestException('returnReason is required when returning an assembly');
        }

        const nextStatus =
            dto.decision === 'ACCEPTED'
                ? AssemblySubmissionStatus.ACCEPTED
                : AssemblySubmissionStatus.RETURNED;

        const updated = await this.prisma.assemblySubmission.update({
            where: { id: existing.id },
            data: {
                status: nextStatus,
                reviewedAt: new Date(),
                reviewedById: ctx.user_id,
                returnReason: dto.decision === 'RETURNED' ? dto.returnReason!.trim() : null,
            },
            include: assemblyInclude,
        });

        await this.auditLog.record({
            ctx,
            action: dto.decision === 'ACCEPTED' ? 'ASSEMBLY_ACCEPTED' : 'ASSEMBLY_RETURNED',
            entityType: 'AssemblySubmission',
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
            kind: accepted
                ? NotificationKind.ASSEMBLY_ACCEPTED
                : NotificationKind.ASSEMBLY_RETURNED,
            title: accepted ? 'Assembly accepted' : 'Assembly returned',
            body: accepted
                ? `Municipal review accepted your ${semesterLabel(updated.semester)}.`
                : `Municipal review returned your ${semesterLabel(updated.semester)} for correction.`,
            entityType: 'AssemblySubmission',
            entityId: updated.id,
            href: '/barangay/assemblies',
            excludeUserId: ctx.user_id,
        });

        return updated;
    }
}
