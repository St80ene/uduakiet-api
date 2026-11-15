import { Controller, Get, Res } from '@nestjs/common';
import express from 'express';

import { MetricsService } from './metrics.service';
import { Public } from '../../auth/decorators/public.decorator';

@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Res() response: express.Response): Promise<void> {
    response.setHeader('Content-Type', this.metricsService.getContentType());

    response.send(await this.metricsService.getMetrics());
  }
}
