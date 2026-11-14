import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequestContextService } from './request_content.service';

@Injectable()
export class AuthenticatedContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    const user = request.user;

    if (user) {
      this.requestContext.setAuthenticatedUser(
        user.id,
        user.businessId,
        user.storeId,
      );
    }

    return next.handle();
  }
}
