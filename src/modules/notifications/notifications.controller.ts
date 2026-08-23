import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantCtx } from '../common/decorators/tenant-context.decorator';
import { TenantContext } from '../common/interfaces/auth.interface';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Get()
    list(@TenantCtx() ctx: TenantContext, @Query('unread') unread?: string) {
        return this.notificationsService.list(ctx, unread === 'true' || unread === '1');
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Get('unread-count')
    unreadCount(@TenantCtx() ctx: TenantContext) {
        return this.notificationsService.unreadCount(ctx);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post('read-all')
    markAllRead(@TenantCtx() ctx: TenantContext) {
        return this.notificationsService.markAllRead(ctx);
    }

    @Roles(AppRole.MAYOR, AppRole.DEPT_HEAD, AppRole.BARANGAY_CAPTAIN, AppRole.BARANGAY_SECRETARY)
    @Post(':id/read')
    async markRead(@TenantCtx() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
        const row = await this.notificationsService.markRead(ctx, id);
        if (!row) {
            throw new NotFoundException('Notification not found');
        }
        return row;
    }
}
