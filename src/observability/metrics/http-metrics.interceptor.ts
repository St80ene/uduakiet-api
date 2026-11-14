import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { performance } from 'node:perf_hooks';

import { MetricsService } from './metrics.service';

interface ExpressRoute {
  path: string;
}

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Do not measure Prometheus scraping requests.
    if (request.path === '/metrics') {
      return next.handle();
    }

    const startTime = performance.now();

    response.once('finish', () => {
      const duration = (performance.now() - startTime) / 1000;

      const method = request.method;
      const routeInfo = request.route as ExpressRoute | undefined;

      const route = routeInfo?.path
        ? `${request.baseUrl}${routeInfo.path}`
        : 'unmatched';

      const statusCode = String(response.statusCode);

      const labels = {
        method,
        route,
        status_code: statusCode,
      };

      this.metricsService.httpRequestsTotal.inc(labels);

      if (response.statusCode >= 500) {
        this.metricsService.httpRequestErrorsTotal.inc(labels);
      }

      this.metricsService.httpRequestDuration.observe(labels, duration);
    });

    return next.handle();
  }
}
