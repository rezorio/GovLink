import { AppRole } from '@prisma/client';
import { TenantContext } from '../interfaces/auth.interface';

export type ResidentPiiLevel = 'full' | 'redacted';

export function residentPiiLevel(ctx: TenantContext, recordBarangayId: string): ResidentPiiLevel {
    if (ctx.barangay_id === recordBarangayId) {
        return 'full';
    }
    if (
        !ctx.barangay_id &&
        ctx.roles.some((role) => role === AppRole.MAYOR || role === AppRole.DEPT_HEAD)
    ) {
        return 'redacted';
    }
    return 'redacted';
}

export function shouldMaskLinkedUserEmail(ctx: TenantContext, subjectUserId: string | null): boolean {
    if (!subjectUserId) {
        return false;
    }
    if (ctx.user_id === subjectUserId) {
        return false;
    }
    if (ctx.barangay_id) {
        return false;
    }
    return ctx.roles.some((role) => role === AppRole.MAYOR || role === AppRole.DEPT_HEAD);
}
