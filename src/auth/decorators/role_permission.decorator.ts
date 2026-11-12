import { Reflector } from '@nestjs/core';
import { UserPermission } from '../../common/enum/user_permission.enum';

export const UserRolePermissions =
  Reflector.createDecorator<UserPermission[]>();
