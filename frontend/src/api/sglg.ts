import { apiRequest } from '@/api/client';
import type { SglgScoresResponse } from '@/types';

export function fetchSglgScores(token: string, periodLabel?: string) {
    const query = periodLabel ? `?periodLabel=${encodeURIComponent(periodLabel)}` : '';
    return apiRequest<SglgScoresResponse>(`/compliance/sglg-scores${query}`, {}, token);
}
