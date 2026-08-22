import { apiRequest } from '@/api/client';
import type { ComplianceMatrix } from '@/types';

export function fetchComplianceMatrix(token: string, periodLabel?: string) {
    const query = periodLabel ? `?periodLabel=${encodeURIComponent(periodLabel)}` : '';
    return apiRequest<ComplianceMatrix>(`/compliance/matrix${query}`, {}, token);
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
