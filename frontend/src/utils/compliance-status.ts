import type { ComplianceStatus } from '@/types';
import type { StatusVariant } from '@/utils/assignment-status';

export function complianceStatusToVariant(status: ComplianceStatus): StatusVariant {
    switch (status) {
        case 'ACCEPTED':
            return 'approved';
        case 'RETURNED':
        case 'OVERDUE':
            return 'overdue';
        default:
            return 'pending';
    }
}

export function complianceStatusLabel(status: ComplianceStatus): string {
    const labels: Record<ComplianceStatus, string> = {
        NOT_STARTED: 'Not started',
        IN_PROGRESS: 'In progress',
        SUBMITTED: 'Submitted',
        UNDER_REVIEW: 'Under review',
        ACCEPTED: 'Accepted',
        RETURNED: 'Returned',
        OVERDUE: 'Overdue',
    };
    return labels[status];
}

export function cellTint(status: ComplianceStatus): string {
    const variant = complianceStatusToVariant(status);
    if (variant === 'approved') {
        return 'bg-status-ok/10';
    }
    if (variant === 'overdue') {
        return 'bg-status-danger/10';
    }
    return 'bg-status-warn/10';
}

/** Kept for tooling / exports; UI cells now show full complianceStatusLabel. */
export function complianceHeatMark(status: ComplianceStatus): string {
    return complianceStatusLabel(status);
}

export function heatCellClass(status: ComplianceStatus): string {
    const variant = complianceStatusToVariant(status);
    if (variant === 'approved') {
        return 'gl-heat-cell gl-heat-ok';
    }
    if (variant === 'overdue') {
        return 'gl-heat-cell gl-heat-danger';
    }
    return 'gl-heat-cell gl-heat-warn';
}
