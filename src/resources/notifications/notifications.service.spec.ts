import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { OutboxEventType } from '../outbox/entities/outbox_events.entity';
import { Notifications } from './entities/notification.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('NotificationsService', () => {
  let service: NotificationsService;

  let manager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  let dataSource: {
    manager: unknown;
    getRepository: jest.Mock;
  };

  let notificationsRepository: jest.Mocked<Repository<Notifications>>;

  const recipientId = 'recipient-uuid';
  const eventId = 'event-uuid';

  const payload: CreateNotificationDto = {
    source_event_id: eventId,
    type: OutboxEventType.LOWSTOCK_DETECTED,
    business_id: 'business-uuid',
    title: 'Low Stock Alert',
    message: 'A product is running low on stock.',
    data: {
      product_id: 'product-uuid',
      current_quantity: 5,
      reorder_point: 10,
    },
    is_read: false,
  };

  const existingNotification = {
    id: 'notification-uuid',
    ...payload,
    recipient_id: recipientId,
    is_read: false,
    created_at: new Date(),
  } as Notifications;

  const createDuplicateError = (
    code = 'ER_DUP_ENTRY',
    errno = 1062,
  ): QueryFailedError =>
    new QueryFailedError(
      'INSERT INTO notifications',
      [],
      Object.assign(new Error('Duplicate entry'), { code, errno }),
    );

  beforeEach(() => {
    manager = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    dataSource = {
      manager,
      getRepository: jest.fn(),
    };

    notificationsRepository = {
      count: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<Notifications>>;

    service = new NotificationsService(
      dataSource as unknown as DataSource,
      notificationsRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('returns an existing notification without inserting', async () => {
      manager.findOne.mockResolvedValue(existingNotification);

      const result = await service.create(
        payload,
        manager as unknown as EntityManager,
        recipientId,
      );

      expect(result).toBe(existingNotification);
      expect(manager.findOne).toHaveBeenCalledTimes(1);
      expect(manager.create).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('creates and saves a notification when none exists', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.create.mockReturnValue(existingNotification);
      manager.save.mockResolvedValue(existingNotification);

      const result = await service.create(
        payload,
        manager as unknown as EntityManager,
        recipientId,
      );

      expect(result).toBe(existingNotification);
      expect(manager.create).toHaveBeenCalledWith(Notifications, {
        ...payload,
        recipient_id: recipientId,
        is_read: false,
      });
      expect(manager.save).toHaveBeenCalledWith(
        Notifications,
        existingNotification,
      );
    });

    it('propagates an error if checking for an existing notification fails', async () => {
      const error = new Error('Database connection failed');
      manager.findOne.mockRejectedValue(error);

      await expect(
        service.create(
          payload,
          manager as unknown as EntityManager,
          recipientId,
        ),
      ).rejects.toBe(error);

      expect(manager.create).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('propagates an error if entity creation fails', async () => {
      const error = new Error('Entity creation failed');

      manager.findOne.mockResolvedValue(null);
      manager.create.mockImplementation(() => {
        throw error;
      });

      await expect(
        service.create(
          payload,
          manager as unknown as EntityManager,
          recipientId,
        ),
      ).rejects.toBe(error);

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('propagates a non-duplicate save error', async () => {
      const error = new Error('Database write failed');

      manager.findOne.mockResolvedValue(null);
      manager.create.mockReturnValue(existingNotification);
      manager.save.mockRejectedValue(error);

      await expect(
        service.create(
          payload,
          manager as unknown as EntityManager,
          recipientId,
        ),
      ).rejects.toBe(error);

      expect(manager.findOne).toHaveBeenCalledTimes(1);
    });

    it('returns the notification when a concurrent insert wins', async () => {
      manager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingNotification);

      manager.create.mockReturnValue(existingNotification);
      manager.save.mockRejectedValue(createDuplicateError());

      const result = await service.create(
        payload,
        manager as unknown as EntityManager,
        recipientId,
      );

      expect(result).toBe(existingNotification);
      expect(manager.findOne).toHaveBeenCalledTimes(2);
    });

    it('rethrows the duplicate error if no matching notification exists', async () => {
      const error = createDuplicateError();

      manager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      manager.create.mockReturnValue(existingNotification);
      manager.save.mockRejectedValue(error);

      await expect(
        service.create(
          payload,
          manager as unknown as EntityManager,
          recipientId,
        ),
      ).rejects.toBe(error);

      expect(manager.findOne).toHaveBeenCalledTimes(2);
    });

    it('propagates an error if duplicate recovery lookup fails', async () => {
      const recoveryError = new Error('Recovery query failed');

      manager.findOne
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(recoveryError);

      manager.create.mockReturnValue(existingNotification);
      manager.save.mockRejectedValue(createDuplicateError());

      await expect(
        service.create(
          payload,
          manager as unknown as EntityManager,
          recipientId,
        ),
      ).rejects.toBe(recoveryError);
    });
  });

  describe('findAllForRecipient', () => {
    it('returns paginated notifications for a recipient with safe bounds', async () => {
      const repoMock = {
        findAndCount: jest.fn().mockResolvedValue([[existingNotification], 1]),
      };
      dataSource.getRepository.mockReturnValue(repoMock);

      const result = await service.findAllForRecipient(recipientId, 1, 20);

      expect(result).toEqual({
        data: [existingNotification],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(repoMock.findAndCount).toHaveBeenCalledWith({
        where: { recipient_id: recipientId },
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('returns the count of unread notifications', async () => {
      notificationsRepository.count.mockResolvedValue(5);

      const count = await service.getUnreadCount(recipientId);

      expect(count).toBe(5);
      expect(notificationsRepository.count).toHaveBeenCalledWith({
        where: {
          recipient_id: recipientId,
          is_read: false,
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('marks an unread notification as read and saves it', async () => {
      const unreadNotification = { ...existingNotification, is_read: false };
      const repoMock = {
        findOne: jest.fn().mockResolvedValue(unreadNotification),
        save: jest
          .fn()
          .mockResolvedValue({ ...unreadNotification, is_read: true }),
      };
      dataSource.getRepository.mockReturnValue(repoMock);

      const result = await service.markAsRead('notification-uuid', recipientId);

      expect(result.is_read).toBe(true);
      expect(repoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'notification-uuid', is_read: true }),
      );
    });

    it('throws NotFoundException if notification does not exist or does not belong to recipient', async () => {
      const repoMock = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      dataSource.getRepository.mockReturnValue(repoMock);

      await expect(
        service.markAsRead('invalid-id', recipientId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('updates all unread notifications for a recipient and returns count', async () => {
      const repoMock = {
        update: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      dataSource.getRepository.mockReturnValue(repoMock);

      const result = await service.markAllAsRead(recipientId);

      expect(result).toEqual({ updated: 3 });
      expect(repoMock.update).toHaveBeenCalledWith(
        { recipient_id: recipientId, is_read: false },
        { is_read: true },
      );
    });
  });
});
