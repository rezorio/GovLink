import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { TenantContext } from '../interfaces/auth.interface';

interface AuditLogParams {
    ctx: TenantContext;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    barangayId?: string | null;
}

@Injectable()
export class AuditLogService {
    constructor(private readonly prisma: PrismaService) {}

    async record(params: AuditLogParams) {
        await this.prisma.auditLog.create({
            data: {
                municipalityId: params.ctx.municipality_id,
                barangayId: params.barangayId ?? params.ctx.barangay_id,
                actorUserId: params.ctx.user_id,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                before: params.before,
                after: params.after,
            },
        });
    }
}
