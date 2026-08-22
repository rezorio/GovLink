export type AppRole = 'MAYOR' | 'DEPT_HEAD' | 'BARANGAY_CAPTAIN' | 'BARANGAY_SECRETARY';

export type TaskAssignmentStatus =
    | 'PENDING_ACK'
    | 'ACKNOWLEDGED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'ACCEPTED'
    | 'RETURNED'
    | 'OVERDUE';

export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    municipality_id: string;
    barangay_id: string | null;
    roles: AppRole[];
    municipality?: {
        id: string;
        name: string;
        province: string;
        psgcCode: string;
    };
    barangay?: {
        id: string;
        name: string;
        psgcCode: string;
    } | null;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    expires_in: string;
    user: AuthUser;
}

export interface TaskSummary {
    id: string;
    title: string;
    description: string;
    legalBasis: string;
    dueDate: string;
}

export interface BarangaySummary {
    id: string;
    name: string;
    psgcCode: string;
}

export interface EvidenceSubmission {
    id: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    status: string;
    submittedAt: string | null;
}

export interface TaskAssignment {
    id: string;
    status: TaskAssignmentStatus;
    municipalityId: string;
    barangayId: string;
    acknowledgedAt: string | null;
    task: TaskSummary;
    barangay: BarangaySummary;
    evidenceSubmissions: EvidenceSubmission[];
}

export interface DirectiveTemplate {
    id: string;
    title: string;
    category: string;
    dilgMcNumber: string;
    description: string;
}
