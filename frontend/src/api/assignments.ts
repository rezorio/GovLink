import { apiRequest } from '@/api/client';
import type { DirectiveTemplate, TaskAssignment } from '@/types';

export function fetchAssignments(token: string) {
    return apiRequest<TaskAssignment[]>('/assignments', {}, token);
}

export function fetchAssignment(token: string, id: string) {
    return apiRequest<TaskAssignment>(`/assignments/${id}`, {}, token);
}

export function fetchDirectiveTemplates(token: string) {
    return apiRequest<DirectiveTemplate[]>('/directives/templates', {}, token);
}

export function assignTask(
    token: string,
    body: {
        directiveTemplateId?: string;
        title: string;
        description: string;
        legalBasis: string;
        dueDate: string;
        barangayIds: string[];
    },
) {
    return apiRequest('/directives/tasks', { method: 'POST', body: JSON.stringify(body) }, token);
}

export function acknowledgeAssignment(token: string, id: string) {
    return apiRequest(`/assignments/${id}/acknowledge`, { method: 'POST' }, token);
}

export function submitEvidence(
    token: string,
    id: string,
    body: {
        fileKey: string;
        fileName: string;
        mimeType: string;
        fileSizeBytes: number;
    },
) {
    return apiRequest(`/assignments/${id}/submissions`, { method: 'POST', body: JSON.stringify(body) }, token);
}

export function reviewAssignment(
    token: string,
    id: string,
    body: { submissionId: string; decision: 'ACCEPTED' | 'RETURNED'; comment?: string },
) {
    return apiRequest(`/assignments/${id}/review`, { method: 'POST', body: JSON.stringify(body) }, token);
}
