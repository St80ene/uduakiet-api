import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Brackets,
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notifications } from './entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { successResponse } from '../../common/utils/response.utils';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

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
    paginationQuery: NotificationPaginationQueryDto,
    user: AuthenticatedUser,
  ) {
    const { limit = 10, cursor, isRead, search } = paginationQuery;

    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.business_id = :businessId', {
        businessId: user.businessId,
      })
      .andWhere('notification.recipient_id = :recipientId', {
        recipientId,
      });

    // Apply the read/unread filter only when explicitly provided.
    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.is_read = :isRead', {
        isRead,
      });
    }

    // Preserve the search functionality inherited from the base DTO.
    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('notification.title LIKE :search', {
            search: `%${search}%`,
          }).orWhere('notification.message LIKE :search', {
            search: `%${search}%`,
          });
        }),
      );
    }

    // Continue fetching records strictly after the previous page.
    if (cursor) {
      const decodedCursor = this.decodeNotificationCursor(cursor);

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('notification.created_at < :cursorCreatedAt', {
            cursorCreatedAt: decodedCursor.createdAt,
          }).orWhere(
            `notification.created_at = :cursorCreatedAt
           AND notification.id < :cursorId`,
            {
              cursorCreatedAt: decodedCursor.createdAt,
              cursorId: decodedCursor.id,
            },
          );
        }),
      );
    }

    // Use a unique tie-breaker to make the ordering deterministic.
    queryBuilder
      .orderBy('notification.created_at', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .take(limit + 1);

    const results = await queryBuilder.getMany();

    // Fetching one extra record tells us whether another page exists.
    const hasNextPage = results.length > limit;
    const notifications = results.slice(0, limit);

    const lastNotification = notifications.at(-1);

    const nextCursor =
      hasNextPage && lastNotification
        ? this.encodeNotificationCursor(lastNotification)
        : null;

    return successResponse('Notifications retrieved successfully', {
      notifications,
      meta: {
        limit,
        nextCursor,
        hasNextPage,
      },
    });
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

  private encodeNotificationCursor(notification: Notifications): string {
    const cursor = {
      createdAt: notification.created_at.toISOString(),
      id: notification.id,
    };

    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeNotificationCursor(cursor: string): {
    createdAt: string;
    id: string;
  } {
    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );

      if (typeof decoded !== 'object' || decoded === null) {
        throw new Error('Invalid cursor payload');
      }

      const payload = decoded as Record<string, unknown>;

      if (
        typeof payload.createdAt !== 'string' ||
        Number.isNaN(Date.parse(payload.createdAt)) ||
        typeof payload.id !== 'string' ||
        payload.id.length === 0
      ) {
        throw new Error('Invalid cursor fields');
      }

      return {
        createdAt: new Date(payload.createdAt).toISOString(),
        id: payload.id,
      };
    } catch {
      throw new BadRequestException('Invalid notification cursor');
    }
  }
}
