import { apiRequest } from '@/api/client';
import type { BarangayResident, ResidentRecordType } from '@/types';

export function fetchResidents(token: string, barangayId?: string) {
    const query = barangayId ? `?barangayId=${encodeURIComponent(barangayId)}` : '';
    return apiRequest<BarangayResident[]>(`/registry/residents${query}`, {}, token);
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
