import { Injectable } from '@nestjs/common';
import { ComplianceScope } from '@prisma/client';
import { TenantContext } from '../../common/interfaces/auth.interface';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { PrismaService } from '../../prisma/prisma.module';
import { currentPeriodForFrequency, effectiveComplianceStatus } from '../period.util';
import { SGLG_PILLARS } from './sglg-pillars';
import {
    aggregateSglgScores,
    InstanceScoreInput,
    PillarScore,
    weakestPillar,
} from './sglg-score.util';

export type SglgBarangayScore = {
    id: string;
    name: string;
    psgcCode: string;
    overallScore: number | null;
    weakestPillar: { pillar: string; label: string; score: number } | null;
    pillars: PillarScore[];
};

export type SglgScoresResponse = {
    periodLabel: string | null;
    generatedAt: string;
    disclaimer: string;
    municipality: {
        overallScore: number | null;
        pillars: PillarScore[];
    };
    barangays: SglgBarangayScore[];
};

@Injectable()
export class SglgScoreService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantScope: TenantScopeService,
    ) {}

    async scores(ctx: TenantContext, periodLabel?: string): Promise<SglgScoresResponse> {
        this.tenantScope.assertMunicipalScope(ctx);

        const [barangays, instances] = await Promise.all([
            this.prisma.barangay.findMany({
                where: { municipalityId: ctx.municipality_id, isActive: true },
                select: { id: true, name: true, psgcCode: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.complianceInstance.findMany({
                where: {
                    municipalityId: ctx.municipality_id,
                    ...(periodLabel ? { periodLabel } : {}),
                    requirement: { scope: ComplianceScope.BARANGAY },
                },
                select: {
                    barangayId: true,
                    periodLabel: true,
                    dueDate: true,
                    status: true,
                    requirement: {
                        select: {
                            weight: true,
                            sglgPillar: true,
                            frequency: true,
                        },
                    },
                },
            }),
        ]);

        const scoped = periodLabel
            ? instances
            : instances.filter((row) => {
                  const current = currentPeriodForFrequency(row.requirement.frequency);
                  return current != null && current.periodLabel === row.periodLabel;
              });

        const periodLabels = new Set(scoped.map((row) => row.periodLabel));
        const resolvedPeriod =
            periodLabel ??
            (periodLabels.size === 1 ? [...periodLabels][0] : null);

        const municipalInputs: InstanceScoreInput[] = scoped.map((row) => ({
            status: effectiveComplianceStatus(row.status, row.dueDate),
            weight: row.requirement.weight,
            pillar: row.requirement.sglgPillar,
        }));

        const municipality = aggregateSglgScores(municipalInputs);

        const byBarangay = new Map<string, InstanceScoreInput[]>();
        for (const brgy of barangays) {
            byBarangay.set(brgy.id, []);
        }
        for (const row of scoped) {
            const list = byBarangay.get(row.barangayId);
            if (!list) {
                continue;
            }
            list.push({
                status: effectiveComplianceStatus(row.status, row.dueDate),
                weight: row.requirement.weight,
                pillar: row.requirement.sglgPillar,
            });
        }

        const barangayScores: SglgBarangayScore[] = barangays.map((brgy) => {
            const agg = aggregateSglgScores(byBarangay.get(brgy.id) ?? []);
            const weak = weakestPillar(agg.pillars);
            return {
                id: brgy.id,
                name: brgy.name,
                psgcCode: brgy.psgcCode,
                overallScore: agg.overallScore,
                weakestPillar:
                    weak && weak.score !== null
                        ? { pillar: weak.pillar, label: weak.label, score: weak.score }
                        : null,
                pillars: agg.pillars,
            };
        });

        barangayScores.sort((a, b) => {
            const aScore = a.overallScore ?? -1;
            const bScore = b.overallScore ?? -1;
            if (bScore !== aScore) {
                return bScore - aScore;
            }
            return a.name.localeCompare(b.name);
        });

        return {
            periodLabel: resolvedPeriod,
            generatedAt: new Date().toISOString(),
            disclaimer:
                'Internal SGLG-aligned readiness from GovLink obligations — not official DILG Seal assessment results.',
            municipality: {
                overallScore: municipality.overallScore,
                pillars: municipality.pillars,
            },
            barangays: barangayScores,
        };
    }

    /** Expose pillar metadata for clients that need labels without scores. */
    listPillars() {
        return SGLG_PILLARS;
    }
}
