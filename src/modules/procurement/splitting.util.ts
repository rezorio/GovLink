/** Normalize supplier name for anti-splitting matching. */
export function normalizeSupplierName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ');
}

export type SplitAssessment = {
    flagged: boolean;
    riskScore: number;
    aggregateCentavos: bigint;
    thresholdCentavos: bigint;
};

/**
 * Flag when same supplier + category + fiscal year aggregate exceeds SVP ceiling.
 */
export function assessSplittingRisk(params: {
    existingAmountsCentavos: bigint[];
    newAmountCentavos: bigint;
    svpMaxCentavos: bigint;
}): SplitAssessment {
    const aggregate =
        params.existingAmountsCentavos.reduce((sum, n) => sum + n, 0n) +
        params.newAmountCentavos;

    if (params.svpMaxCentavos <= 0n) {
        return {
            flagged: false,
            riskScore: 0,
            aggregateCentavos: aggregate,
            thresholdCentavos: params.svpMaxCentavos,
        };
    }

    const flagged = aggregate > params.svpMaxCentavos;
    const ratio = Number(aggregate) / Number(params.svpMaxCentavos);
    const riskScore = flagged
        ? Math.min(100, Math.round(ratio * 50))
        : Math.min(49, Math.round(ratio * 40));

    return {
        flagged,
        riskScore,
        aggregateCentavos: aggregate,
        thresholdCentavos: params.svpMaxCentavos,
    };
}
