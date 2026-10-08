import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Retrieve the roles required for this specific handler
    const requiredRoles = this.reflector.get(Roles, context.getHandler());

    // 2. If no roles are defined on the endpoint, allow access by default
    if (!requiredRoles) {
      return true;
    }

    // 3. Extract the user attached by the authentication guard/passport
    const { user }: { user?: AuthenticatedUser } = context
      .switchToHttp()
      .getRequest();

    // 4. Check if the user has at least one of the required roles
    const hasRole = requiredRoles.some((role) => user?.role.name === role);
    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have the required role to access this resource',
      );
    }
    return true;
  }
}
