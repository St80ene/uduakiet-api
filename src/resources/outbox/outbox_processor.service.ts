import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import {
  OutboxEvent,
  OutboxEventStatus,
} from './entities/outbox_events.entity';

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);

  // Prevent overlapping polling cycles in this application instance.
  private isRunning = false;

  private readonly batchSize = 25;
  private readonly maxAttempts = 10;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Check for eligible events every five seconds.
  @Interval(5000)
  // Check for eligible events every five seconds.
  @Interval(5000)
  async processPendingEvents(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      const events = await this.outboxRepository.find({
        where: {
          status: OutboxEventStatus.PENDING,
          available_at: LessThanOrEqual(new Date()),
        },
        order: { created_at: 'ASC' },
        take: this.batchSize,
      });

      if (events.length === 0) {
        return;
      }

      this.logger.debug(`Found ${events.length} pending outbox event(s)`);

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error(
        'Failed to poll the outbox',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async processEvent(event: OutboxEvent): Promise<void> {
    try {
      // Refuse to silently discard events with no registered handler.
      if (this.eventEmitter.listenerCount(event.event_type) === 0) {
        throw new Error(
          `No handler registered for event type: ${event.event_type}`,
        );
      }

      // Persist progress before dispatching the event.
      event.status = OutboxEventStatus.PROCESSING;
      event.attempts += 1;
      await this.outboxRepository.save(event);

      // Dispatch evvents and wait for asynchronous listeners to finish.
      // A rejected listener causes this dispatch to fail.
      await this.eventEmitter.emitAsync(event.event_type, event.payload);

      event.status = OutboxEventStatus.PUBLISHED;
      event.processed_at = new Date();
      event.last_error = null;

      await this.outboxRepository.save({ ...event });

      this.logger.log(
        `Published outbox event ${event.id} (${event.event_type})`,
      );
    } catch (error) {
      await this.handleFailure(event, error);
    }
  }

  private async handleFailure(
    event: OutboxEvent,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);

    event.last_error = message;

    if (event.attempts >= this.maxAttempts) {
      event.status = OutboxEventStatus.FAILED;
    } else {
      event.status = OutboxEventStatus.PENDING;

      // Exponential backoff: 5s, 10s, 20s, 40s...
      // Cap the delay at 15 minutes.
      const delayMs = Math.min(
        5000 * 2 ** Math.max(0, event.attempts - 1),
        15 * 60 * 1000,
      );

      event.available_at = new Date(Date.now() + delayMs);
    }

    try {
      await this.outboxRepository.save(event);
    } catch (saveError) {
      this.logger.error(
        `Could not persist failure state for event ${event.id}`,
        saveError instanceof Error ? saveError.stack : String(saveError),
      );
      return;
    }

    this.logger.error(
      `Event ${event.id} failed (attempt ${event.attempts}): ${message}`,
    );
  }
}
