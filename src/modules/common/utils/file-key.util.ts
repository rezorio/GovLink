import { BadRequestException } from '@nestjs/common';
import { TenantContext } from '../interfaces/auth.interface';

/** Allowed upload entity path segments under `{muni}/{brgy}/{entity}/...`. */
const ALLOWED_ENTITIES = new Set(['submissions', 'procurement']);

export function assertEvidenceFileKey(ctx: TenantContext, fileKey: string): void {
    assertTenantFileKey(ctx, fileKey, 'submissions');
}

export function assertTenantFileKey(
    ctx: TenantContext,
    fileKey: string,
    entityType: string,
): void {
    const entity = entityType.replace(/[^a-z0-9_-]/gi, '').toLowerCase();
    if (!ALLOWED_ENTITIES.has(entity)) {
        throw new BadRequestException(`Unsupported upload entityType: ${entityType}`);
    }
    if (!ctx.barangay_id) {
        throw new BadRequestException('Barangay scope required for file keys');
    }
    const expectedPrefix = `${ctx.municipality_id}/${ctx.barangay_id}/${entity}/`;
    if (!fileKey.startsWith(expectedPrefix)) {
        throw new BadRequestException(
            'fileKey must use tenant-scoped path from presigned upload',
        );
    }
    if (fileKey.includes('..')) {
        throw new BadRequestException('Invalid fileKey path');
    }
}
