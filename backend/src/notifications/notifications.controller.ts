import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private notifService: NotificationsService) { }

    @Get()
    getAll(@CurrentUser() user: UserPayload) {
        return this.notifService.getForUser(user.id, user.tenantId);
    }

    @Get('unread-count')
    unreadCount(@CurrentUser() user: UserPayload) {
        return this.notifService.getUnreadCount(user.id, user.tenantId).then((count) => ({ count }));
    }

    @Post(':id/read')
    markRead(@Param('id') id: string, @CurrentUser() user: UserPayload) {
        return this.notifService.markRead(id, user.tenantId);
    }

    @Post('mark-all-read')
    markAllRead(@CurrentUser() user: UserPayload) {
        return this.notifService.markAllRead(user.id, user.tenantId);
    }

    @Delete(':id')
    deleteOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
        return this.notifService.deleteOne(id, user.tenantId);
    }

    @Delete()
    clearAll(@CurrentUser() user: UserPayload) {
        return this.notifService.clearAll(user.id, user.tenantId);
    }
}
