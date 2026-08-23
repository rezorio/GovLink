import { apiRequest } from '@/api/client';
import type { PlanMatrix, PlanSubmission, PlanType } from '@/types';

export type FetchPlanMatrixParams = {
    planType?: PlanType;
    page?: number;
    pageSize?: number;
    q?: string;
};

export function fetchPlanMatrix(token: string, params: FetchPlanMatrixParams = {}) {
    const search = new URLSearchParams();
    if (params.planType) search.set('planType', params.planType);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    if (params.q?.trim()) search.set('q', params.q.trim());
    const query = search.toString();
    return apiRequest<PlanMatrix>(`/plans/matrix${query ? `?${query}` : ''}`, {}, token);
}

export function fetchPlans(token: string, planType?: PlanType) {
    const query = planType ? `?planType=${planType}` : '';
    return apiRequest<PlanSubmission[]>(`/plans${query}`, {}, token);
}

export function openPlanPeriods(token: string) {
    return apiRequest<{ created: number; skipped: number }>(
        '/plans/periods/open',
        { method: 'POST', body: JSON.stringify({}) },
        token,
    );
}

export function updatePlanDraft(
    token: string,
    id: string,
    payload: { title?: string; notes?: string },
) {
    return apiRequest<PlanSubmission>(`/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    }, token);
}

export function submitPlan(token: string, id: string) {
    return apiRequest<PlanSubmission>(`/plans/${id}/submit`, { method: 'POST' }, token);
}

export function reviewPlan(
    token: string,
    id: string,
    payload: { decision: 'ACCEPTED' | 'RETURNED'; returnReason?: string },
) {
    return apiRequest<PlanSubmission>(`/plans/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token);
}
