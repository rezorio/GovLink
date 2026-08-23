import { apiRequest } from '@/api/client';
import type { ComplianceInstance, ComplianceMatrix, ComplianceRequirement } from '@/types';

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

export function fetchComplianceRequirements(token: string, scope?: string) {
    const query = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    return apiRequest<ComplianceRequirement[]>(`/compliance/requirements${query}`, {}, token);
}

export type CreateRequirementPayload = {
    code: string;
    title: string;
    legalBasis: string;
    category: string;
    frequency: string;
    evidenceTypes: string[];
    weight?: number;
    scope?: string;
    sglgPillar?: string;
};

export function createComplianceRequirement(token: string, payload: CreateRequirementPayload) {
    return apiRequest<ComplianceRequirement>('/compliance/requirements', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token);
}

export function updateComplianceRequirement(
    token: string,
    id: string,
    payload: Partial<CreateRequirementPayload> & { isActive?: boolean },
) {
    return apiRequest<ComplianceRequirement>(`/compliance/requirements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    }, token);
}

export function deactivateComplianceRequirement(token: string, id: string) {
    return apiRequest<ComplianceRequirement>(`/compliance/requirements/${id}`, {
        method: 'DELETE',
    }, token);
}