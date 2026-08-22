import { Injectable } from '@nestjs/common';
import { ComplianceStatus } from '@prisma/client';
import { TenantContext } from '../../common/interfaces/auth.interface';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { PrismaService } from '../../prisma/prisma.module';
import { effectiveComplianceStatus } from '../../compliance/period.util';

export type PassFail = 'PASS' | 'FAIL' | 'PENDING';

export interface ScorecardRow {
    id: string;
    psgc: string;
    barangay: string;
    requirementCode: string;
    requirement: string;
    periodLabel: string;
    dueDate: string;
    status: ComplianceStatus;
    passFail: PassFail;
    daysOverdue: number;
}

export interface ScorecardPayload {
    municipality: { id: string; name: string; province: string; psgcCode: string };
    generatedBy: { id: string; fullName: string; email: string; roles: string[] };
    periodLabel: string | null;
    rows: ScorecardRow[];
}

@Injectable()
export class ComplianceScorecardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
    ) {}

    async buildPayload(ctx: TenantContext, periodLabel?: string): Promise<ScorecardPayload> {
        this.tenantScope.assertMunicipalScope(ctx);

        const [municipality, user, instances] = await Promise.all([
            this.prisma.municipality.findUniqueOrThrow({
                where: { id: ctx.municipality_id },
                select: { id: true, name: true, province: true, psgcCode: true },
            }),
            this.prisma.user.findUniqueOrThrow({
                where: { id: ctx.user_id },
                select: { id: true, fullName: true, email: true, roles: true },
            }),
            this.prisma.complianceInstance.findMany({
                where: {
                    municipalityId: ctx.municipality_id,
                    ...(periodLabel ? { periodLabel } : {}),
                },
                include: {
                    barangay: { select: { name: true, psgcCode: true } },
                    requirement: { select: { code: true, title: true } },
                },
                orderBy: [
                    { barangay: { name: 'asc' } },
                    { requirement: { code: 'asc' } },
                    { periodLabel: 'asc' },
                ],
            }),
        ]);

        const now = new Date();
        const rows: ScorecardRow[] = instances.map((row) => {
            const status = effectiveComplianceStatus(row.status, row.dueDate, now);
            const due = new Date(row.dueDate);
            const msPerDay = 1000 * 60 * 60 * 24;
            const daysOverdue = Math.max(
                0,
                Math.floor((now.getTime() - due.getTime()) / msPerDay),
            );

            return {
                id: row.id,
                psgc: row.barangay.psgcCode,
                barangay: row.barangay.name,
                requirementCode: row.requirement.code,
                requirement: row.requirement.title,
                periodLabel: row.periodLabel,
                dueDate: row.dueDate.toISOString().slice(0, 10),
                status,
                passFail: this.toPassFail(status),
                daysOverdue: status === ComplianceStatus.OVERDUE ? daysOverdue : 0,
            };
        });

        return {
            municipality,
            generatedBy: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                roles: user.roles,
            },
            periodLabel: periodLabel ?? null,
            rows,
        };
    }

    canonicalForHash(payload: ScorecardPayload) {
        return {
            report_type: 'compliance_scorecard',
            municipality_id: payload.municipality.id,
            period_label: payload.periodLabel,
            rows: payload.rows
                .map((r) => ({
                    id: r.id,
                    status: r.status,
                    pass_fail: r.passFail,
                    due_date: r.dueDate,
                }))
                .sort((a, b) => a.id.localeCompare(b.id)),
        };
    }

    private toPassFail(status: ComplianceStatus): PassFail {
        if (status === ComplianceStatus.ACCEPTED) {
            return 'PASS';
        }
        if (
            status === ComplianceStatus.OVERDUE ||
            status === ComplianceStatus.RETURNED
        ) {
            return 'FAIL';
        }
        return 'PENDING';
    }
}
