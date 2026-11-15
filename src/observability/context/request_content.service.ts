import { Injectable } from '@nestjs/common';
import { requestContextStorage } from './request_context';

@Injectable()
export class RequestContextService {
  getContext() {
    return requestContextStorage.getStore();
  }

  getRequestId(): string | undefined {
    return this.getContext()?.requestId;
  }

  getUserId(): string | undefined {
    return this.getContext()?.userId;
  }

  getBusinessId(): string | undefined {
    return this.getContext()?.businessId;
  }

  setAuthenticatedUser(
    userId: string,
    businessId?: string,
    storeId?: string,
  ): void {
    const context = this.getContext();

    if (!context) return;

    context.userId = userId;
    context.businessId = businessId;
    context.storeId = storeId;
  }
}
