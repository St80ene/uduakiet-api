import { Reflector } from '@nestjs/core';
import { UserPermission } from '../enum/user_permission.enum';

export const UserRolePermissions =
  Reflector.createDecorator<UserPermission[]>();
