import { Controller } from '@nestjs/common';
import { OutboxProcessorService } from './outbox_processor.service';

@Controller('outbox')
export class OutboxController {
  constructor(private readonly outboxService: OutboxProcessorService) {}
}
