import { apiRequest } from '@/api/client';
import type { BarangaySummary } from '@/types';

export function fetchBarangays(token: string) {
    return apiRequest<BarangaySummary[]>('/barangays', {}, token);
}
