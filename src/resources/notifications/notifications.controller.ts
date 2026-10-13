import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() { id }: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe)
    limit: number,
  ) {
    return this.notificationsService.findAllForRecipient(id, page, limit);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() { id: userId }: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() { id }: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(id);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() { id: userId }: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }
}
