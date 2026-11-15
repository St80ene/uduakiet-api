import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { requestContextStorage } from './request_context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID();

    res.setHeader('x-request-id', requestId);

    requestContextStorage.run({ requestId }, () => next());
  }
}
