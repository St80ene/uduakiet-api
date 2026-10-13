import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Logger } from '@nestjs/common';
import {
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  jest,
} from '@jest/globals';

import { OutboxProcessorService } from './outbox_processor.service';
import {
  OutboxEvent,
  OutboxEventType,
  OutboxEventStatus,
  OutboxEventAggregateType,
} from './entities/outbox_events.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.mock('@nestjs/event-emitter', () => ({
  OnEvent: jest.fn(() => () => undefined),
  EventEmitter2: jest.fn().mockImplementation(() => ({
    listenerCount: jest.fn(),
    emitAsync: jest.fn(),
  })),
}));

describe('OutboxProcessorService', () => {
  let service: OutboxProcessorService;
  let outboxRepository: jest.Mocked<Repository<OutboxEvent>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEvent: OutboxEvent = {
    id: 'event-uuid',
    event_type: OutboxEventType.LOWSTOCK_DETECTED,
    payload: { business_id: 'biz-1' },
    status: OutboxEventStatus.PENDING,
    attempts: 0,
    available_at: new Date(),
    created_at: new Date(),
    processed_at: null,
    last_error: null,
    aggregate_id: 'aggregate-uuid',
    aggregate_type: OutboxEventAggregateType.STOCKS,
    business_id: 'business-uuid',
    store_id: 'store-uuid',
  };

  beforeEach(async () => {
    // Suppress NestJS logger noise during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxProcessorService,
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            listenerCount: jest.fn(),
            emitAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OutboxProcessorService>(OutboxProcessorService);
    outboxRepository = module.get<jest.Mocked<Repository<OutboxEvent>>>(
      getRepositoryToken(OutboxEvent),
    );

    eventEmitter = module.get<jest.Mocked<EventEmitter2>>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPendingEvents', () => {
    it('should do nothing if no pending events are found', async () => {
      outboxRepository.find.mockResolvedValue([]);

      await service.processPendingEvents();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(outboxRepository.find).toHaveBeenCalledWith({
        where: {
          status: OutboxEventStatus.PENDING,
          available_at: LessThanOrEqual(expect.any(Date)),
        },
        order: { created_at: 'ASC' },
        take: 25,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('should successfully process and publish a pending event', async () => {
      const savedCalls: OutboxEvent[] = [];
      outboxRepository.find.mockResolvedValue([mockEvent]);
      eventEmitter.listenerCount.mockReturnValue(1);
      eventEmitter.emitAsync.mockResolvedValue([]);

      // Capture shallow copies of objects passed to save
      outboxRepository.save.mockImplementation(async (event) => {
        savedCalls.push({ ...(event as OutboxEvent) });
        return event as OutboxEvent;
      });

      await service.processPendingEvents();

      // Check the first save state captured in our array
      expect(savedCalls[0]).toEqual(
        expect.objectContaining({
          status: OutboxEventStatus.PROCESSING,
          attempts: 1,
        }),
      );

      // Check the second save state
      expect(savedCalls[1]).toEqual(
        expect.objectContaining({
          status: OutboxEventStatus.PUBLISHED,
          last_error: null,
        }),
      );
    });

    it('should prevent overlapping polling runs if already running', async () => {
      // Simulate a long-running find operation
      let resolveFind!: (events: OutboxEvent[]) => void;
      const findPromise = new Promise<OutboxEvent[]>((resolve) => {
        resolveFind = resolve;
      });
      outboxRepository.find.mockReturnValue(findPromise);

      // Trigger first execution (won't finish yet)
      const firstRun = service.processPendingEvents();

      // Trigger second execution while first is running
      await service.processPendingEvents();

      // Resolve the first run
      resolveFind([mockEvent]);
      eventEmitter.listenerCount.mockReturnValue(1);
      eventEmitter.emitAsync.mockResolvedValue([]);
      outboxRepository.save.mockResolvedValue(mockEvent);

      await firstRun;

      // Repository find should only have been called once due to concurrency guard (`isRunning`)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(outboxRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should catch repository poll errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      outboxRepository.find.mockRejectedValue(dbError);

      await expect(service.processPendingEvents()).resolves.not.toThrow();
    });
  });

  describe('event handling and failures', () => {
    it('should throw an error and handle failure if no listener is registered for the event type', async () => {
      outboxRepository.find.mockResolvedValue([mockEvent]);
      eventEmitter.listenerCount.mockReturnValue(0); // No listeners
      outboxRepository.save.mockResolvedValue(mockEvent);

      await service.processPendingEvents();

      // Should transition to pending with backoff or failed depending on attempts
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(outboxRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_error: `No handler registered for event type: ${mockEvent.event_type}`,
          status: OutboxEventStatus.PENDING,
        }),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });

    it('should mark event as FAILED when maxAttempts (10) is reached', async () => {
      const exhaustedEvent: OutboxEvent = {
        ...mockEvent,
        attempts: 10,
      };

      outboxRepository.find.mockResolvedValue([exhaustedEvent]);
      eventEmitter.listenerCount.mockReturnValue(1);
      eventEmitter.emitAsync.mockRejectedValue(new Error('Handler crashed'));
      outboxRepository.save.mockResolvedValue(exhaustedEvent);

      await service.processPendingEvents();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(outboxRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OutboxEventStatus.FAILED,
          last_error: 'Handler crashed',
        }),
      );
    });

    it('should calculate exponential backoff delay when attempts < maxAttempts', async () => {
      const retryEvent: OutboxEvent = {
        ...mockEvent,
        attempts: 2, // Next attempt will be 3
      };

      outboxRepository.find.mockResolvedValue([retryEvent]);
      eventEmitter.listenerCount.mockReturnValue(1);
      eventEmitter.emitAsync.mockRejectedValue(new Error('Temporary glitch'));
      outboxRepository.save.mockResolvedValue(retryEvent);

      const beforeTime = Date.now();
      await service.processPendingEvents();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(outboxRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OutboxEventStatus.PENDING,
          last_error: 'Temporary glitch',
        }),
      );

      // Verify available_at was pushed into the future (Backoff for attempt 2 -> 5000 * 2^(2-1) = 10000ms)
      expect(retryEvent.available_at.getTime()).toBeGreaterThanOrEqual(
        beforeTime + 10000,
      );
    });

    it('should handle save errors gracefully during failure handling', async () => {
      outboxRepository.find.mockResolvedValue([mockEvent]);
      eventEmitter.listenerCount.mockReturnValue(0); // Triggers error
      outboxRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.processPendingEvents()).resolves.not.toThrow();
    });
  });
});
