import { ForbiddenException, Injectable } from '@nestjs/common';
import { TenantContext } from '../interfaces/auth.interface';

@Injectable()
export class TenantScopeService {
    assignmentListFilter(ctx: TenantContext) {
        return {
            municipalityId: ctx.municipality_id,
            ...(ctx.barangay_id ? { barangayId: ctx.barangay_id } : {}),
        };
    }

    assignmentMutationFilter(ctx: TenantContext) {
        return this.assignmentListFilter(ctx);
    }

    assertMunicipalScope(ctx: TenantContext): void {
        if (ctx.barangay_id) {
            throw new ForbiddenException('Municipal scope required for this action');
        }
    }

    assertBarangayScope(ctx: TenantContext): void {
        if (!ctx.barangay_id) {
            throw new ForbiddenException('Barangay scope required for this action');
        }
    }
}
