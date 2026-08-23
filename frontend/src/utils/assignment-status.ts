import type { TaskAssignmentStatus } from '@/types';

export type StatusVariant = 'approved' | 'pending' | 'overdue';

export function statusToVariant(status: TaskAssignmentStatus): StatusVariant {
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

export function statusLabel(status: TaskAssignmentStatus): string {
    const labels: Record<TaskAssignmentStatus, string> = {
        PENDING_ACK: 'Pending',
        ACKNOWLEDGED: 'Acknowledged',
        IN_PROGRESS: 'In progress',
        SUBMITTED: 'Awaiting review',
        ACCEPTED: 'Accepted',
        RETURNED: 'Returned',
        OVERDUE: 'Overdue',
    };
    return labels[status];
}

export function formatDueDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Manila',
    });
}

export function daysRemaining(iso: string): number {
    const due = new Date(iso);
    const now = new Date();
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
