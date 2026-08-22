import { BadRequestException } from '@nestjs/common';
import { TenantContext } from '../interfaces/auth.interface';

export function assertEvidenceFileKey(ctx: TenantContext, fileKey: string): void {
    const expectedPrefix = `${ctx.municipality_id}/${ctx.barangay_id}/submissions/`;
    if (!fileKey.startsWith(expectedPrefix)) {
        throw new BadRequestException(
            'fileKey must use tenant-scoped path from presigned upload',
        );
    }

    if (fileKey.includes('..')) {
        throw new BadRequestException('Invalid fileKey path');
    }
}
