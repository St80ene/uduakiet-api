import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';

import {
  OutboxEventType,
  type LowStockEvent,
} from '../../entities/outbox_events.entity';
import { NotificationsService } from '../../../notifications/notifications.service';
import { CreateNotificationDto } from '../../../notifications/dto/create-notification.dto';
import { User } from '../../../users/entities/user.entity';
import { UserRole } from '../../../../common/enum/user_role.enum';
import { NotificationsGateway } from '../../../../common/Gateways/notification.gateway';

@Injectable()
export class LowStockHandler {
  private readonly logger = new Logger(LowStockHandler.name);

  constructor(
    private readonly notifications_service: NotificationsService,
    private readonly data_source: DataSource,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @OnEvent(OutboxEventType.LOWSTOCK_DETECTED, { async: true })
  async handle(payload: LowStockEvent): Promise<void> {
    const queryRunner = this.data_source.createQueryRunner();

    // Keep each recipient paired with their persisted notification.
    const notificationsToEmit: Array<{
      recipientId: string;
      notification: Awaited<ReturnType<NotificationsService['create']>>;
    }> = [];

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const {
        business_id,
        store_id,
        event_id,
        current_quantity,
        reorder_point,
        is_out_of_stock,
      } = payload;

      // Find business admins and managers assigned to the affected store.
      const recipients = await queryRunner.manager
        .getRepository(User)
        .createQueryBuilder('user')
        .innerJoin('user.role', 'role')
        .where('user.business_id = :business_id', { business_id })
        .andWhere('user.deleted_at IS NULL')
        .andWhere(
          '(role.name = :adminRole OR (role.name = :managerRole AND user.store_id = :store_id))',
          {
            adminRole: UserRole.ADMIN,
            managerRole: UserRole.MANAGER,
            store_id,
          },
        )
        .getMany();

      if (recipients.length === 0) {
        this.logger.warn(
          `No recipients found for low-stock event in business ${business_id}, store ${store_id}.`,
        );

        // No eligible recipients: commit and finish without retrying indefinitely.
        await queryRunner.commitTransaction();
        return;
      }

      const notificationPayload: CreateNotificationDto = {
        business_id,
        source_event_id: event_id,
        type: OutboxEventType.LOWSTOCK_DETECTED,
        title: is_out_of_stock ? 'Out of Stock Alert' : 'Low Stock Alert',
        message: is_out_of_stock
          ? 'A product is out of stock.'
          : `A product has ${current_quantity} units remaining, below the reorder point of ${reorder_point}.`,
        data: payload,
        is_read: false,
      };

      // Persist one notification per recipient within the transaction.
      for (const recipient of recipients) {
        const savedNotification = await this.notifications_service.create(
          notificationPayload,
          queryRunner.manager,
          recipient.id,
        );

        notificationsToEmit.push({
          recipientId: recipient.id,
          notification: savedNotification,
        });
      }

      // Commit before emitting, so clients never receive an uncommitted notification.
      await queryRunner.commitTransaction();

      // Notify every recipient's active connections.
      for (const { recipientId, notification } of notificationsToEmit) {
        this.notificationsGateway.emitToUser(recipientId, notification);
      }

      this.logger.log(
        `Processed low-stock event ${event_id} for ${recipients.length} recipient(s).`,
      );
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      this.logger.error(
        `Failed to process low-stock notification for business ${payload.business_id}.`,
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
