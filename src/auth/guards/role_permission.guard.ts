import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';

@Injectable()
export class RolePermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions: string[] = this.reflector.getAllAndOverride<
      string[]
    >(UserRolePermissions, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions) {
      return true;
    }

    const { user }: { user?: AuthenticatedUser } = context
      .switchToHttp()
      .getRequest();

    const hasPermission = requiredPermissions.every((permission) =>
      user?.role.rolePermissions?.some(
        (role_permission) => role_permission.permission.name === permission,
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have the required permissions to access this resource',
      );
    }

    return true;
  }
}
