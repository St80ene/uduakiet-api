import { Controller, Get, Patch, Param, Query, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { NotificationPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotificationsGateway } from '../../common/Gateways/notification.gateway';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRolePermissions } from '../../auth/decorators/role_permission.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

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
    @Query() paginationQuery: NotificationPaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.findAllForRecipient(
      id,
      paginationQuery,
      user,
    );
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
