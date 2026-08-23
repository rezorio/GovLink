import { ComplianceStatus, SglgPillar } from '@prisma/client';
import { SGLG_PILLARS, sglgPillarLabel } from './sglg-pillars';

export type InstanceScoreInput = {
    status: ComplianceStatus;
    weight: number;
    pillar: SglgPillar | null;
};

export type PillarScore = {
    pillar: SglgPillar;
    label: string;
    score: number | null;
    weightedCredit: number;
    weightedTotal: number;
    requirementCount: number;
    accepted: number;
    submitted: number;
    inProgress: number;
    overdue: number;
    returned: number;
    notStarted: number;
};

/** Weighted credit fraction for a single instance status. */
export function statusCreditFraction(status: ComplianceStatus): number {
    switch (status) {
        case ComplianceStatus.ACCEPTED:
            return 1;
        case ComplianceStatus.SUBMITTED:
        case ComplianceStatus.UNDER_REVIEW:
            return 0.5;
        case ComplianceStatus.IN_PROGRESS:
            return 0.25;
        default:
            return 0;
    }
}

export function roundScore(value: number): number {
    return Math.round(value * 10) / 10;
}

function emptyPillarBucket(_pillar: SglgPillar): {
    weightedCredit: number;
    weightedTotal: number;
    requirementCount: number;
    accepted: number;
    submitted: number;
    inProgress: number;
    overdue: number;
    returned: number;
    notStarted: number;
} {
    return {
        weightedCredit: 0,
        weightedTotal: 0,
        requirementCount: 0,
        accepted: 0,
        submitted: 0,
        inProgress: 0,
        overdue: 0,
        returned: 0,
        notStarted: 0,
    };
}

function bumpStatusCount(
    bucket: ReturnType<typeof emptyPillarBucket>,
    status: ComplianceStatus,
): void {
    switch (status) {
        case ComplianceStatus.ACCEPTED:
            bucket.accepted += 1;
            break;
        case ComplianceStatus.SUBMITTED:
        case ComplianceStatus.UNDER_REVIEW:
            bucket.submitted += 1;
            break;
        case ComplianceStatus.IN_PROGRESS:
            bucket.inProgress += 1;
            break;
        case ComplianceStatus.OVERDUE:
            bucket.overdue += 1;
            break;
        case ComplianceStatus.RETURNED:
            bucket.returned += 1;
            break;
        case ComplianceStatus.NOT_STARTED:
            bucket.notStarted += 1;
            break;
    }
}

/** Aggregate instance rows into the ten SGLG pillars (+ overall). */
export function aggregateSglgScores(instances: InstanceScoreInput[]): {
    overallScore: number | null;
    pillars: PillarScore[];
} {
    const byPillar = new Map<SglgPillar, ReturnType<typeof emptyPillarBucket>>();
    for (const meta of SGLG_PILLARS) {
        byPillar.set(meta.pillar, emptyPillarBucket(meta.pillar));
    }

    let overallCredit = 0;
    let overallTotal = 0;

    for (const row of instances) {
        if (!row.pillar) {
            continue;
        }
        const bucket = byPillar.get(row.pillar);
        if (!bucket) {
            continue;
        }

        const weight = row.weight > 0 ? row.weight : 1;
        const credit = statusCreditFraction(row.status) * weight;

        bucket.weightedCredit += credit;
        bucket.weightedTotal += weight;
        bucket.requirementCount += 1;
        bumpStatusCount(bucket, row.status);

        overallCredit += credit;
        overallTotal += weight;
    }

    const pillars: PillarScore[] = SGLG_PILLARS.map((meta) => {
        const bucket = byPillar.get(meta.pillar)!;
        const score =
            bucket.weightedTotal > 0
                ? roundScore((bucket.weightedCredit / bucket.weightedTotal) * 100)
                : null;

        return {
            pillar: meta.pillar,
            label: sglgPillarLabel(meta.pillar),
            score,
            weightedCredit: roundScore(bucket.weightedCredit),
            weightedTotal: bucket.weightedTotal,
            requirementCount: bucket.requirementCount,
            accepted: bucket.accepted,
            submitted: bucket.submitted,
            inProgress: bucket.inProgress,
            overdue: bucket.overdue,
            returned: bucket.returned,
            notStarted: bucket.notStarted,
        };
    });

    const overallScore =
        overallTotal > 0 ? roundScore((overallCredit / overallTotal) * 100) : null;

    return { overallScore, pillars };
}

/** Weakest scored pillar (null scores ignored). */
export function weakestPillar(pillars: PillarScore[]): PillarScore | null {
    const scored = pillars.filter((p) => p.score !== null);
    if (scored.length === 0) {
        return null;
    }
    return scored.reduce((min, row) => (row.score! < min.score! ? row : min));
}
