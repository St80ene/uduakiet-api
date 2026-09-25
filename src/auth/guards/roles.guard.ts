import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '../../common/enum/user_role.enum';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { User } from '../../resources/users/entities/user.entity';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the required roles from route metadata (Handler or Class level)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. Extract the request and user context
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authUser = request.user;

    if (!authUser) {
      throw new UnauthorizedException('Authentication context is missing');
    }

    // Safely extract the user entity from your wrapper structure
    const user = (authUser['data'] || authUser) as User;

    if (!user || !user.role) {
      throw new ForbiddenException(
        'User roles information is missing or malformed',
      );
    }

    // 3. Normalize user roles into an array
    // (Handles cases where user.roles might be an array of objects or an array of enums)
    const userRoleName: UserRole = user.role.name;

    // 4. Check if the user possesses AT LEAST ONE of the required roles (OR logic)
    // Alternatively, change .some() to .every() if you require ALL roles.
    const hasRequiredRole = requiredRoles.some(
      (requiredRole) => userRoleName === requiredRole,
    );

    if (!hasRequiredRole) {
      this.logger.warn(
        `Access denied for user ID ${user['id'] || 'unknown'}. Required: [${requiredRoles.join(', ')}], User has: [${userRoleName}]`,
      );
    }

    return hasRequiredRole;
  }
}
