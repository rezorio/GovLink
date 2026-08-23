import type {
    BarangaySummary,
    ComplianceMatrix,
    ComplianceMatrixCell,
    ComplianceRequirementSummary,
    ComplianceStatus,
} from '@/types';
import { complianceStatusToVariant } from '@/utils/compliance-status';

export type BarangayComplianceSummary = {
    barangay: BarangaySummary;
    total: number;
    accepted: number;
    urgent: number;
    pending: number;
    worstStatus: ComplianceStatus | null;
};

const URGENT: ComplianceStatus[] = ['OVERDUE', 'RETURNED', 'SUBMITTED', 'UNDER_REVIEW'];

export function isUrgentStatus(status: ComplianceStatus): boolean {
    return URGENT.includes(status);
}

export function buildBarangaySummaries(matrix: ComplianceMatrix | null): BarangayComplianceSummary[] {
    if (!matrix) {
        return [];
    }

    const byBarangay = new Map<string, ComplianceMatrixCell[]>();
    for (const cell of matrix.cells) {
        const list = byBarangay.get(cell.barangayId) ?? [];
        list.push(cell);
        byBarangay.set(cell.barangayId, list);
    }

    return matrix.barangays.map((barangay) => {
        const cells = byBarangay.get(barangay.id) ?? [];
        let accepted = 0;
        let urgent = 0;
        let pending = 0;
        let worstStatus: ComplianceStatus | null = null;
        let worstRank = -1;

        for (const cell of cells) {
            if (cell.status === 'ACCEPTED') {
                accepted += 1;
            } else if (isUrgentStatus(cell.status)) {
                urgent += 1;
            } else {
                pending += 1;
            }
            const rank = statusUrgencyRank(cell.status);
            if (rank > worstRank) {
                worstRank = rank;
                worstStatus = cell.status;
            }
        }

        return {
            barangay,
            total: cells.length,
            accepted,
            urgent,
            pending,
            worstStatus,
        };
    });
}

function statusUrgencyRank(status: ComplianceStatus): number {
    switch (status) {
        case 'OVERDUE':
            return 5;
        case 'RETURNED':
            return 4;
        case 'SUBMITTED':
        case 'UNDER_REVIEW':
            return 3;
        case 'IN_PROGRESS':
            return 2;
        case 'NOT_STARTED':
            return 1;
        case 'ACCEPTED':
        default:
            return 0;
    }
}

export function cellsForBarangay(
    matrix: ComplianceMatrix | null,
    barangayId: string,
): Array<{
    cell: ComplianceMatrixCell;
    requirement: ComplianceRequirementSummary;
}> {
    if (!matrix) {
        return [];
    }
    const reqMap = new Map(matrix.requirements.map((req) => [req.id, req]));
    return matrix.cells
        .filter((cell) => cell.barangayId === barangayId)
        .map((cell) => ({
            cell,
            requirement: reqMap.get(cell.requirementId)!,
        }))
        .filter((row) => row.requirement)
        .sort((a, b) => a.requirement.code.localeCompare(b.requirement.code));
}

export function groupCellsByCategory(
    rows: Array<{ cell: ComplianceMatrixCell; requirement: ComplianceRequirementSummary }>,
) {
    const groups = new Map<
        string,
        Array<{ cell: ComplianceMatrixCell; requirement: ComplianceRequirementSummary }>
    >();
    for (const row of rows) {
        const key = (row.requirement.category || '').trim() || 'Other';
        const list = groups.get(key) ?? [];
        list.push(row);
        groups.set(key, list);
    }
    return Array.from(groups.entries())
        .map(([category, items]) => ({ category, items }))
        .sort((a, b) => a.category.localeCompare(b.category));
}

export function summaryTone(summary: BarangayComplianceSummary): 'ok' | 'warn' | 'danger' {
    if (!summary.worstStatus) {
        return 'warn';
    }
    const variant = complianceStatusToVariant(summary.worstStatus);
    if (variant === 'approved') return 'ok';
    if (variant === 'overdue') return 'danger';
    return 'warn';
}
