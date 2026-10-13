import { Module } from '@nestjs/common';
import { OutboxProcessorService } from './outbox_processor.service';
import { OutboxController } from './outbox.controller';
import { OutboxEvent } from './entities/outbox_events.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LowStockHandler } from './services/handlers/low_stock.handler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent]), NotificationsModule],
  controllers: [OutboxController],
  providers: [OutboxProcessorService, LowStockHandler],
  exports: [OutboxProcessorService],
})
export class OutboxModule {}
