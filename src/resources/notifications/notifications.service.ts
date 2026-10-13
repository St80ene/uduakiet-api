import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notifications } from './entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';

export interface INotificationCriteria {
  source_event_id: string;
  recipient_id: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly data_source: DataSource,
    @InjectRepository(Notifications)
    private readonly notificationsRepository: Repository<Notifications>,
  ) {}

  async create(
    payload: CreateNotificationDto,
    manager: EntityManager = this.data_source.manager,
    recipientId: string,
  ): Promise<Notifications> {
    const notificationCriteria: INotificationCriteria = {
      source_event_id: payload.source_event_id,
      recipient_id: recipientId,
    };

    // 1. Check whether this event has already notified this recipient.
    const existing = await manager.findOne(Notifications, {
      where: notificationCriteria,
    });

    if (existing) {
      return existing;
    }

    // 2. Create the notification if it does not exist.
    const notification = manager.create(Notifications, {
      ...payload,
      recipient_id: recipientId,
      is_read: false,
    });

    try {
      return await manager.save(Notifications, notification);
    } catch (error) {
      // 3. Only handle unique-constraint violations.
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      // Another worker may have inserted it after our initial check.
      const concurrentNotification = await manager.findOne(Notifications, {
        where: notificationCriteria,
      });

      if (concurrentNotification) {
        return concurrentNotification;
      }

      // The constraint violation was unrelated to this notification.
      throw error;
    }
  }

  async findAllForRecipient(
    recipientId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: Notifications[];
    total: number;
    page: number;
    limit: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [data, total] = await this.data_source
      .getRepository(Notifications)
      .findAndCount({
        where: { recipient_id: recipientId },
        order: { created_at: 'DESC' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      });

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  public async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: {
        recipient_id: recipientId,
        is_read: false,
      },
    });
  }

  async markAsRead(
    notificationId: string,
    recipientId: string,
  ): Promise<Notifications> {
    const repository = this.data_source.getRepository(Notifications);

    // Scope the lookup to the recipient to prevent cross-user access.
    const notification = await repository.findOne({
      where: {
        id: notificationId,
        recipient_id: recipientId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    if (!notification.is_read) {
      notification.is_read = true;
      await repository.save(notification);
    }

    return notification;
  }

  async markAllAsRead(recipientId: string): Promise<{ updated: number }> {
    const result = await this.data_source.getRepository(Notifications).update(
      {
        recipient_id: recipientId,
        is_read: false,
      },
      { is_read: true },
    );

    return { updated: result.affected ?? 0 };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      errno?: number;
    };

    return (
      driverError.code === 'ER_DUP_ENTRY' ||
      driverError.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      driverError.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
      driverError.errno === 1062
    );
  }
}
