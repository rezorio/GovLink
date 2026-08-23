import { Injectable } from '@nestjs/common';
import { AppRole, NotificationKind, Prisma } from '@prisma/client';
import { TenantContext } from '../common/interfaces/auth.interface';
import { PrismaService } from '../prisma/prisma.module';

export interface NotifyPayload {
    municipalityId: string;
    barangayId?: string | null;
    kind: NotificationKind;
    title: string;
    body: string;
    entityType: string;
    entityId: string;
    href?: string | null;
    /** Skip notifying this user (usually the actor). */
    excludeUserId?: string;
}

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    list(ctx: TenantContext, unreadOnly = false) {
        return this.prisma.notification.findMany({
            where: {
                municipalityId: ctx.municipality_id,
                recipientUserId: ctx.user_id,
                ...(unreadOnly ? { readAt: null } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async unreadCount(ctx: TenantContext) {
        const count = await this.prisma.notification.count({
            where: {
                municipalityId: ctx.municipality_id,
                recipientUserId: ctx.user_id,
                readAt: null,
            },
        });
        return { count };
    }

    async markRead(ctx: TenantContext, id: string) {
        const existing = await this.prisma.notification.findFirst({
            where: {
                id,
                municipalityId: ctx.municipality_id,
                recipientUserId: ctx.user_id,
            },
        });
        if (!existing) {
            return null;
        }
        if (existing.readAt) {
            return existing;
        }
        return this.prisma.notification.update({
            where: { id },
            data: { readAt: new Date() },
        });
    }

    async markAllRead(ctx: TenantContext) {
        const result = await this.prisma.notification.updateMany({
            where: {
                municipalityId: ctx.municipality_id,
                recipientUserId: ctx.user_id,
                readAt: null,
            },
            data: { readAt: new Date() },
        });
        return { updated: result.count };
    }

    /** Fan-out to active barangay staff in one barangay. */
    async notifyBarangayUsers(payload: NotifyPayload) {
        if (!payload.barangayId) {
            return;
        }
        const users = await this.prisma.user.findMany({
            where: {
                municipalityId: payload.municipalityId,
                barangayId: payload.barangayId,
                isActive: true,
                deletedAt: null,
                roles: {
                    hasSome: [AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY],
                },
            },
            select: { id: true },
        });
        await this.createForRecipients(users.map((u) => u.id), payload);
    }

    /** Fan-out to active municipal staff (mayor / dept head). */
    async notifyMunicipalUsers(payload: NotifyPayload) {
        const users = await this.prisma.user.findMany({
            where: {
                municipalityId: payload.municipalityId,
                barangayId: null,
                isActive: true,
                deletedAt: null,
                roles: {
                    hasSome: [AppRole.MAYOR, AppRole.DEPT_HEAD],
                },
            },
            select: { id: true },
        });
        await this.createForRecipients(users.map((u) => u.id), payload);
    }

    private async createForRecipients(recipientIds: string[], payload: NotifyPayload) {
        const ids = recipientIds.filter((id) => id !== payload.excludeUserId);
        if (ids.length === 0) {
            return;
        }

        const rows: Prisma.NotificationCreateManyInput[] = ids.map((recipientUserId) => ({
            municipalityId: payload.municipalityId,
            barangayId: payload.barangayId ?? null,
            recipientUserId,
            kind: payload.kind,
            title: payload.title,
            body: payload.body,
            entityType: payload.entityType,
            entityId: payload.entityId,
            href: payload.href ?? null,
        }));

        await this.prisma.notification.createMany({ data: rows });
    }
}
