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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';
import { UserPermission } from '../../common/enum/user_permission.enum';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
  ])
  @UserRolePermissions([UserPermission.NOTIFICATION_READ_ALL])
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

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
  ])
  @UserRolePermissions([UserPermission.NOTIFICATION_UNREAD_COUNT])
  @Get('unread-count')
  getUnreadCount(@CurrentUser() { id: userId }: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
  ])
  @UserRolePermissions([UserPermission.NOTIFICATION_UPDATE_READ_ALL])
  @Patch('read-all')
  markAllAsRead(@CurrentUser() { id }: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(id);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
  ])
  @UserRolePermissions([UserPermission.NOTIFICATION_READ_ONE])
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() { id: userId }: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }
}
