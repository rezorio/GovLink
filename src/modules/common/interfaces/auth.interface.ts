export { AppRole } from '@prisma/client';

export interface JwtPayload {
    sub: string;
    email: string;
    municipality_id: string;
    barangay_id: string | null;
    roles: import('@prisma/client').AppRole[];
}

export interface TenantContext {
    user_id: string;
    email: string;
    municipality_id: string;
    barangay_id: string | null;
    roles: import('@prisma/client').AppRole[];
}

export type AuthenticatedUser = JwtPayload;
