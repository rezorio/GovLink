import { apiRequest } from '@/api/client';
import type {
    AppLineItem,
    AppLineStatus,
    BacDesignation,
    BacMember,
    ContractStatus,
    ProcurementChain,
    ProcurementContract,
    ProcurementDocType,
    ProcurementDocument,
    ProcurementMode,
    ProcurementOversight,
} from '@/types';

export function fetchAppLines(token: string, fiscalYear?: number) {
    const query = fiscalYear != null ? `?fiscalYear=${fiscalYear}` : '';
    return apiRequest<AppLineItem[]>(`/procurement/app-lines${query}`, {}, token);
}

export function createAppLine(
    token: string,
    payload: {
        fiscalYear: number;
        code: string;
        description: string;
        category: string;
        approvedAmountCentavos: number;
        status?: AppLineStatus;
    },
) {
    return apiRequest<AppLineItem>(
        '/procurement/app-lines',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
    );
}

export function approveAppLine(token: string, id: string) {
    return apiRequest<AppLineItem>(`/procurement/app-lines/${id}/approve`, { method: 'POST' }, token);
}

export function fetchContracts(token: string, fiscalYear?: number) {
    const query = fiscalYear != null ? `?fiscalYear=${fiscalYear}` : '';
    return apiRequest<ProcurementContract[]>(`/procurement/contracts${query}`, {}, token);
}

export function createContract(
    token: string,
    payload: {
        appLineItemId: string;
        title: string;
        supplierName: string;
        amountCentavos: number;
        mode: ProcurementMode;
    },
) {
    return apiRequest<ProcurementContract>(
        '/procurement/contracts',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
    );
}

export function advanceContract(token: string, id: string, targetStatus: ContractStatus) {
    return apiRequest<ProcurementContract>(
        `/procurement/contracts/${id}/advance`,
        { method: 'POST', body: JSON.stringify({ targetStatus }) },
        token,
    );
}

export function acknowledgeSplit(token: string, id: string) {
    return apiRequest<ProcurementContract>(
        `/procurement/contracts/${id}/acknowledge-split`,
        { method: 'POST' },
        token,
    );
}

export function fetchProcurementOversight(token: string, fiscalYear?: number) {
    const query = fiscalYear != null ? `?fiscalYear=${fiscalYear}` : '';
    return apiRequest<ProcurementOversight>(`/procurement/oversight${query}`, {}, token);
}

export function fetchContractChain(token: string, contractId: string) {
    return apiRequest<ProcurementChain>(`/procurement/contracts/${contractId}/chain`, {}, token);
}

export function fetchContractDocuments(token: string, contractId: string) {
    return apiRequest<ProcurementDocument[]>(
        `/procurement/contracts/${contractId}/documents`,
        {},
        token,
    );
}

export function createContractDocument(
    token: string,
    contractId: string,
    payload: {
        docType: ProcurementDocType;
        title: string;
        notes?: string;
        fileKey?: string;
        fileName?: string;
        mimeType?: string;
        fileSizeBytes?: number;
        quotationSupplierName?: string;
        quotationAmountCentavos?: number;
    },
) {
    return apiRequest<ProcurementDocument>(
        `/procurement/contracts/${contractId}/documents`,
        { method: 'POST', body: JSON.stringify(payload) },
        token,
    );
}

export function voidContractDocument(
    token: string,
    contractId: string,
    docId: string,
    reason: string,
) {
    return apiRequest<ProcurementDocument>(
        `/procurement/contracts/${contractId}/documents/${docId}/void`,
        { method: 'POST', body: JSON.stringify({ reason }) },
        token,
    );
}

export function fetchBacMembers(token: string, barangayId?: string) {
    const query = barangayId ? `?barangayId=${barangayId}` : '';
    return apiRequest<BacMember[]>(`/procurement/bac-members${query}`, {}, token);
}

export function createBacMember(
    token: string,
    payload: {
        displayName: string;
        designation: BacDesignation;
        termStart: string;
        designationDate: string;
        userId?: string;
    },
) {
    return apiRequest<BacMember>(
        '/procurement/bac-members',
        { method: 'POST', body: JSON.stringify(payload) },
        token,
    );
}

export function deactivateBacMember(token: string, id: string) {
    return apiRequest<BacMember>(`/procurement/bac-members/${id}/deactivate`, { method: 'POST' }, token);
}
