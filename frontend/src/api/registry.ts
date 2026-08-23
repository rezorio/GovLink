import { apiRequest } from '@/api/client';
import type { BarangayResident, PaginatedResult, ResidentRecordType } from '@/types';

export type FetchResidentsParams = {
    barangayId?: string;
    page?: number;
    pageSize?: number;
    q?: string;
};

export function fetchResidents(token: string, params: FetchResidentsParams = {}) {
    const search = new URLSearchParams();
    if (params.barangayId) search.set('barangayId', params.barangayId);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    if (params.q?.trim()) search.set('q', params.q.trim());
    const query = search.toString();
    return apiRequest<PaginatedResult<BarangayResident>>(
        `/registry/residents${query ? `?${query}` : ''}`,
        {},
        token,
    );
}

export function createResident(
    token: string,
    payload: {
        fullName: string;
        addressLine: string;
        phone: string;
        birthYear?: number;
        recordType?: ResidentRecordType;
    },
) {
    return apiRequest<BarangayResident>('/registry/residents', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token);
}
