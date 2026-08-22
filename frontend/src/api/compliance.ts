import { apiRequest } from '@/api/client';
import type { ComplianceInstance, ComplianceMatrix } from '@/types';

export function fetchComplianceMatrix(token: string, periodLabel?: string) {
    const query = periodLabel ? `?periodLabel=${encodeURIComponent(periodLabel)}` : '';
    return apiRequest<ComplianceMatrix>(`/compliance/matrix${query}`, {}, token);
}

export function fetchComplianceInstances(token: string, periodLabel?: string) {
    const query = periodLabel ? `?periodLabel=${encodeURIComponent(periodLabel)}` : '';
    return apiRequest<ComplianceInstance[]>(`/compliance/instances${query}`, {}, token);
}

export function fetchComplianceReviewQueue(token: string) {
    return apiRequest<ComplianceInstance[]>('/compliance/review-queue', {}, token);
}

export function openCompliancePeriods(token: string, periodLabel?: string) {
    return apiRequest<{ created: number; skipped: number }>(
        '/compliance/periods/open',
        {
            method: 'POST',
            body: JSON.stringify(periodLabel ? { periodLabel } : {}),
        },
        token,
    );
}

export function startComplianceInstance(token: string, id: string) {
    return apiRequest<ComplianceInstance>(`/compliance/instances/${id}/start`, { method: 'POST' }, token);
}

export function submitComplianceInstance(token: string, id: string) {
    return apiRequest<ComplianceInstance>(`/compliance/instances/${id}/submit`, { method: 'POST' }, token);
}

export function reviewComplianceInstance(
    token: string,
    id: string,
    payload: { decision: 'ACCEPTED' | 'RETURNED'; returnReason?: string; comment?: string },
) {
    return apiRequest<ComplianceInstance>(
        `/compliance/instances/${id}/review`,
        {
            method: 'POST',
            body: JSON.stringify(payload),
        },
        token,
    );
}
