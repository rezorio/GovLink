import { ContractStatus, ProcurementDocType, ProcurementMode } from '@prisma/client';

/** Default SVP/shopping quotation count (GPPB practice; config-driven later). */
export const DEFAULT_MIN_QUOTATIONS = 3;

export type ChainDocSummary = {
    docType: ProcurementDocType;
    activeCount: number;
};

export type ChainRequirement = {
    docType: ProcurementDocType;
    minCount: number;
    label: string;
};

export type ChainCheckItem = ChainRequirement & {
    present: number;
    satisfied: boolean;
};

/** Status transitions for the RFQ / award document chain. */
export const CONTRACT_STATUS_FLOW: Record<ContractStatus, ContractStatus | null> = {
    [ContractStatus.DRAFT]: ContractStatus.PLANNED,
    [ContractStatus.PLANNED]: ContractStatus.RFQ_ISSUED,
    [ContractStatus.RFQ_ISSUED]: ContractStatus.QUOTATIONS_RECEIVED,
    [ContractStatus.QUOTATIONS_RECEIVED]: ContractStatus.EVALUATION,
    [ContractStatus.EVALUATION]: ContractStatus.AWARD_RECOMMENDED,
    [ContractStatus.AWARD_RECOMMENDED]: ContractStatus.AWARDED,
    [ContractStatus.AWARDED]: ContractStatus.ACTIVE,
    [ContractStatus.ACTIVE]: ContractStatus.COMPLETED,
    [ContractStatus.COMPLETED]: null,
};

/**
 * Documents required before entering `targetStatus`.
 * COMPETITIVE_BIDDING uses the same spine for MVP (tightened later).
 */
export function requirementsForTargetStatus(
    target: ContractStatus,
    mode: ProcurementMode,
    minQuotations = DEFAULT_MIN_QUOTATIONS,
): ChainRequirement[] {
    const needsQuotes =
        mode === ProcurementMode.SVP ||
        mode === ProcurementMode.SHOPPING ||
        mode === ProcurementMode.COMPETITIVE_BIDDING;

    switch (target) {
        case ContractStatus.RFQ_ISSUED:
            return [{ docType: ProcurementDocType.RFQ, minCount: 1, label: 'RFQ document' }];
        case ContractStatus.QUOTATIONS_RECEIVED:
            return needsQuotes
                ? [
                      {
                          docType: ProcurementDocType.QUOTATION,
                          minCount: minQuotations,
                          label: `${minQuotations} distinct supplier quotations`,
                      },
                  ]
                : [];
        case ContractStatus.EVALUATION:
            return [
                {
                    docType: ProcurementDocType.ABSTRACT,
                    minCount: 1,
                    label: 'Abstract of quotations',
                },
            ];
        case ContractStatus.AWARD_RECOMMENDED:
            return [
                {
                    docType: ProcurementDocType.BAC_RESOLUTION,
                    minCount: 1,
                    label: 'BAC resolution',
                },
            ];
        case ContractStatus.AWARDED:
            return [
                {
                    docType: ProcurementDocType.NOTICE_OF_AWARD,
                    minCount: 1,
                    label: 'Notice of Award',
                },
            ];
        case ContractStatus.ACTIVE:
            return [
                {
                    docType: ProcurementDocType.CONTRACT_DOC,
                    minCount: 1,
                    label: 'Signed contract document',
                },
            ];
        case ContractStatus.COMPLETED:
            return [
                {
                    docType: ProcurementDocType.DELIVERY_RECEIPT,
                    minCount: 1,
                    label: 'Delivery receipt',
                },
                {
                    docType: ProcurementDocType.INSPECTION_ACCEPTANCE,
                    minCount: 1,
                    label: 'Inspection and acceptance',
                },
            ];
        default:
            return [];
    }
}

export function evaluateChain(
    docs: ChainDocSummary[],
    requirements: ChainRequirement[],
): { items: ChainCheckItem[]; ok: boolean; missingLabels: string[] } {
    const byType = new Map(docs.map((d) => [d.docType, d.activeCount]));
    const items: ChainCheckItem[] = requirements.map((req) => {
        const present = byType.get(req.docType) ?? 0;
        const label =
            req.docType === ProcurementDocType.QUOTATION
                ? `${req.minCount} distinct supplier quotations`
                : req.label;
        return {
            ...req,
            label,
            present,
            satisfied: present >= req.minCount,
        };
    });
    const missingLabels = items.filter((i) => !i.satisfied).map((i) => i.label);
    return { items, ok: missingLabels.length === 0, missingLabels };
}

/** Full checklist for a contract at its current status (next-step readiness). */
export function nextStepRequirements(
    currentStatus: ContractStatus,
    mode: ProcurementMode,
    minQuotations = DEFAULT_MIN_QUOTATIONS,
): { nextStatus: ContractStatus | null; requirements: ChainRequirement[] } {
    const nextStatus = CONTRACT_STATUS_FLOW[currentStatus];
    if (!nextStatus) {
        return { nextStatus: null, requirements: [] };
    }
    return {
        nextStatus,
        requirements: requirementsForTargetStatus(nextStatus, mode, minQuotations),
    };
}
