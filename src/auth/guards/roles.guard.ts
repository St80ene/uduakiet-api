import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enum/user_role.enum';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { User } from '../../resources/users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    /*
     * Get the user from the request
     * @param context The execution context of the request
     * @return boolean Returns true if the user has the required roles, false otherwise
     */
    const user_request = context.switchToHttp().getRequest();
    const user = user_request.user as User;
    console.log('user => ', user);
    const roles = requiredRoles.some((role) => role[user.role.name]);

    console.log('roles => ', roles);

    return roles;
  }
}
