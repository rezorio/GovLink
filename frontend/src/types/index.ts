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

export type ComplianceStatus =
    | 'NOT_STARTED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'ACCEPTED'
    | 'RETURNED'
    | 'OVERDUE';

export interface ComplianceRequirementSummary {
    id: string;
    code: string;
    title: string;
    frequency: string;
    category: string;
}

export interface ComplianceMatrixCell {
    id: string;
    barangayId: string;
    requirementId: string;
    periodLabel: string;
    dueDate: string;
    status: ComplianceStatus;
}

export interface ComplianceInstance {
    id: string;
    municipalityId: string;
    barangayId: string;
    requirementId: string;
    periodLabel: string;
    dueDate: string;
    status: ComplianceStatus;
    submittedAt: string | null;
    reviewedAt: string | null;
    returnReason: string | null;
    barangay: BarangaySummary;
    requirement: ComplianceRequirementSummary & { weight?: number };
}

export interface ComplianceMatrix {
    barangays: BarangaySummary[];
    requirements: ComplianceRequirementSummary[];
    cells: ComplianceMatrixCell[];
    statusCounts: {
        notStarted: number;
        inProgress: number;
        submitted: number;
        accepted: number;
        overdue: number;
        returned: number;
    };
}

export type SglgPillar =
    | 'FINANCIAL_ADMINISTRATION'
    | 'DISASTER_PREPAREDNESS'
    | 'SOCIAL_PROTECTION'
    | 'HEALTH_COMPLIANCE'
    | 'SUSTAINABLE_EDUCATION'
    | 'BUSINESS_FRIENDLINESS'
    | 'SAFETY_PEACE_ORDER'
    | 'ENVIRONMENTAL_MANAGEMENT'
    | 'TOURISM_CULTURE'
    | 'YOUTH_DEVELOPMENT';

export interface SglgPillarScore {
    pillar: SglgPillar;
    label: string;
    score: number | null;
    weightedCredit: number;
    weightedTotal: number;
    requirementCount: number;
    accepted: number;
    submitted: number;
    inProgress: number;
    overdue: number;
    returned: number;
    notStarted: number;
}

export interface SglgBarangayScore {
    id: string;
    name: string;
    psgcCode: string;
    overallScore: number | null;
    weakestPillar: { pillar: string; label: string; score: number } | null;
    pillars: SglgPillarScore[];
}

export interface SglgScoresResponse {
    periodLabel: string | null;
    generatedAt: string;
    disclaimer: string;
    municipality: {
        overallScore: number | null;
        pillars: SglgPillarScore[];
    };
    barangays: SglgBarangayScore[];
}

export type ProcurementMode = 'SHOPPING' | 'SVP' | 'COMPETITIVE_BIDDING' | 'DIRECT';
export type AppLineStatus = 'DRAFT' | 'APPROVED';
export type ContractStatus =
    | 'DRAFT'
    | 'PLANNED'
    | 'RFQ_ISSUED'
    | 'QUOTATIONS_RECEIVED'
    | 'EVALUATION'
    | 'AWARD_RECOMMENDED'
    | 'AWARDED'
    | 'ACTIVE'
    | 'COMPLETED';

export type ProcurementDocType =
    | 'RFQ'
    | 'QUOTATION'
    | 'ABSTRACT'
    | 'BAC_RESOLUTION'
    | 'NOTICE_OF_AWARD'
    | 'CONTRACT_DOC'
    | 'DELIVERY_RECEIPT'
    | 'INSPECTION_ACCEPTANCE';

export type BacDesignation = 'CHAIR' | 'VICE_CHAIR' | 'MEMBER';

export interface BacMember {
    id: string;
    municipalityId: string;
    barangayId: string;
    userId: string | null;
    displayName: string;
    designation: BacDesignation;
    termStart: string;
    designationDate: string;
    isActive: boolean;
    user?: { id: string; fullName: string; email: string } | null;
}

export interface ProcurementDocument {
    id: string;
    contractId: string;
    docType: ProcurementDocType;
    title: string;
    fileKey: string | null;
    fileName: string | null;
    mimeType: string | null;
    notes: string | null;
    quotationSupplierName: string | null;
    quotationAmountCentavos: string | null;
    version: number;
    voidedAt: string | null;
    voidReason: string | null;
}

export interface ProcurementChainCheckItem {
    docType: ProcurementDocType;
    minCount: number;
    label: string;
    present: number;
    satisfied: boolean;
}

export interface ProcurementChain {
    contractId: string;
    status: ContractStatus;
    mode: ProcurementMode;
    nextStatus: ContractStatus | null;
    minQuotations: number;
    nextStep: {
        items: ProcurementChainCheckItem[];
        ok: boolean;
        missingLabels: string[];
    };
    checklist: ProcurementChainCheckItem[];
    splittingFlagged: boolean;
    splittingAcknowledged: boolean;
    canAdvance: boolean;
}

export interface AppLineItem {
    id: string;
    municipalityId: string;
    barangayId: string;
    fiscalYear: number;
    code: string;
    description: string;
    category: string;
    approvedAmountCentavos: string;
    status: AppLineStatus;
    barangay?: BarangaySummary;
}

export interface ProcurementContract {
    id: string;
    municipalityId: string;
    barangayId: string;
    appLineItemId: string;
    title: string;
    supplierName: string;
    amountCentavos: string;
    mode: ProcurementMode;
    status: ContractStatus;
    fiscalYear: number;
    category: string;
    splittingRiskScore: number | null;
    splittingFlagged: boolean;
    splittingAcknowledgedAt: string | null;
    barangay?: BarangaySummary;
    appLineItem?: {
        id: string;
        code: string;
        description: string;
        category: string;
        approvedAmountCentavos: string;
        status: AppLineStatus;
    };
}

export interface ProcurementOversight {
    fiscalYear: number;
    sglgPillar: string;
    totals: {
        appLineCount: number;
        contractCount: number;
        totalAppCentavos: string;
        totalContractCentavos: string;
        appComplianceRate: number | null;
        pendingSplitFlags: number;
    };
    flaggedContracts: ProcurementContract[];
    contracts: ProcurementContract[];
}

export type ResidentRecordType = 'RESIDENT' | 'KASAMBAHAY';

export interface BarangayResident {
    id: string;
    municipalityId: string;
    barangayId: string;
    fullName: string;
    addressLine: string;
    phone: string;
    birthYear: number | null;
    recordType: ResidentRecordType;
    piiMasked: boolean;
    createdAt: string;
    updatedAt: string;
}
