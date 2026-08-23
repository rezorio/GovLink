import type { StatusVariant } from '@/utils/assignment-status';

/** Score band for SGLG readiness rails/badges. */
export function sglgScoreVariant(score: number | null): StatusVariant | 'muted' {
    if (score === null) {
        return 'muted';
    }
    if (score >= 80) {
        return 'approved';
    }
    if (score >= 50) {
        return 'pending';
    }
    return 'overdue';
}

export function sglgRailClass(score: number | null): string {
    const variant = sglgScoreVariant(score);
    if (variant === 'approved') {
        return 'gl-rail-ok';
    }
    if (variant === 'overdue') {
        return 'gl-rail-danger';
    }
    if (variant === 'pending') {
        return 'gl-rail-warn';
    }
    return '';
}

export function formatSglgScore(score: number | null): string {
    if (score === null) {
        return '—';
    }
    return `${score}%`;
}
