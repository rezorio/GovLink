import { apiRequest } from '@/api/client';
import type { AssemblyMatrix, AssemblySemester, AssemblySubmission } from '@/types';

export function fetchAssemblyMatrix(token: string, semester?: AssemblySemester) {
    const query = semester ? `?semester=${semester}` : '';
    return apiRequest<AssemblyMatrix>(`/assemblies/matrix${query}`, {}, token);
}

export function fetchAssemblies(token: string, semester?: AssemblySemester) {
    const query = semester ? `?semester=${semester}` : '';
    return apiRequest<AssemblySubmission[]>(`/assemblies${query}`, {}, token);
}

export function openAssemblyPeriods(token: string) {
    return apiRequest<{ created: number; skipped: number }>(
        '/assemblies/periods/open',
        { method: 'POST', body: JSON.stringify({}) },
        token,
    );
}

export function updateAssemblyDraft(
    token: string,
    id: string,
    payload: {
        title?: string;
        notes?: string;
        heldAt?: string;
        venue?: string;
        attendanceCount?: number;
    },
) {
    return apiRequest<AssemblySubmission>(`/assemblies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    }, token);
}

export function submitAssembly(token: string, id: string) {
    return apiRequest<AssemblySubmission>(`/assemblies/${id}/submit`, { method: 'POST' }, token);
}

export function reviewAssembly(
    token: string,
    id: string,
    payload: { decision: 'ACCEPTED' | 'RETURNED'; returnReason?: string },
) {
    return apiRequest<AssemblySubmission>(`/assemblies/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token);
}
