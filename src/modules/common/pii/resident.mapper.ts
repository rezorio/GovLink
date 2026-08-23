import { BarangayResident } from '@prisma/client';
import { TenantContext } from '../interfaces/auth.interface';
import { maskAddress, maskPhone } from './pii-mask.util';
import { residentPiiLevel } from './pii-policy';

export interface ResidentResponse {
    id: string;
    municipalityId: string;
    barangayId: string;
    fullName: string;
    addressLine: string;
    phone: string;
    birthYear: number | null;
    recordType: string;
    piiMasked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export function toResidentResponse(ctx: TenantContext, row: BarangayResident): ResidentResponse {
    const level = residentPiiLevel(ctx, row.barangayId);
    const redacted = level === 'redacted';

    return {
        id: row.id,
        municipalityId: row.municipalityId,
        barangayId: row.barangayId,
        fullName: row.fullName,
        addressLine: redacted ? maskAddress(row.addressLine) : row.addressLine,
        phone: redacted ? maskPhone(row.phone) : row.phone,
        birthYear: row.birthYear,
        recordType: row.recordType,
        piiMasked: redacted,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
