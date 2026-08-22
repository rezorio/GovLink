import { Injectable } from '@nestjs/common';
import {
    ComplianceScope,
    ComplianceStatus,
    Prisma,
} from '@prisma/client';
import { TenantContext } from '../common/interfaces/auth.interface';
import { AuditLogService } from '../common/services/audit-log.service';
import { TenantScopeService } from '../common/services/tenant-scope.service';
import { PrismaService } from '../prisma/prisma.module';
import { OpenPeriodDto } from './dto/open-period.dto';
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
    ) {}

    listRequirements(scope?: ComplianceScope) {
        return this.prisma.complianceRequirement.findMany({
            where: scope ? { scope } : undefined,
            orderBy: [{ category: 'asc' }, { code: 'asc' }],
        });
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
                where: { scope: ComplianceScope.BARANGAY },
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
                where: { scope: ComplianceScope.BARANGAY },
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
