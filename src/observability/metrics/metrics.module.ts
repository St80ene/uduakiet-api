import { Module } from '@nestjs/common';

import { MetricsService } from './metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, HttpMetricsInterceptor],
  exports: [MetricsService, HttpMetricsInterceptor],
})
export class MetricsModule {}
