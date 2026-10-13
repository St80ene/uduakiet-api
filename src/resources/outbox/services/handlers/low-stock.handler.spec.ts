import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { NotificationsService } from '../../../notifications/notifications.service';
import { CreateNotificationDto } from '../../../notifications/dto/create-notification.dto';
import { Notifications } from '../../../notifications/entities/notification.entity';
import { User } from '../../../users/entities/user.entity';
import {
  OutboxEventType,
  type LowStockEvent,
} from '../../entities/outbox_events.entity';
import { UserRole } from '../../../../common/enum/user_role.enum';
import { NotificationsGateway } from '../../../../common/Gateways/notification.gateway';
import { LowStockHandler } from './low_stock.handler';

jest.mock('@nestjs/event-emitter', () => ({
  OnEvent: jest.fn(() => () => undefined),
}));

// Match the actual NotificationsService.create() signature.
type CreateNotification = (
  payload: CreateNotificationDto,
  manager: EntityManager,
  recipientId: string,
) => Promise<Notifications>;

describe('LowStockHandler', () => {
  let module: TestingModule;
  let handler: LowStockHandler;

  let dataSource: {
    createQueryRunner: ReturnType<typeof jest.fn>;
  };

  let queryBuilder: {
    innerJoin: ReturnType<typeof jest.fn>;
    where: ReturnType<typeof jest.fn>;
    andWhere: ReturnType<typeof jest.fn>;
    getMany: ReturnType<typeof jest.fn>;
  };

  let managerMock: EntityManager;

  let queryRunner: {
    connect: ReturnType<typeof jest.fn>;
    startTransaction: ReturnType<typeof jest.fn>;
    commitTransaction: ReturnType<typeof jest.fn>;
    rollbackTransaction: ReturnType<typeof jest.fn>;
    release: ReturnType<typeof jest.fn>;
    isTransactionActive: boolean;
    manager: EntityManager;
  };

  let notificationsService: {
    create: jest.Mock<CreateNotification>;
  };

  let notificationsGateway: {
    emitToUser: ReturnType<typeof jest.fn>;
  };

  let logger: {
    warn: ReturnType<typeof jest.fn>;
    error: ReturnType<typeof jest.fn>;
    log: ReturnType<typeof jest.fn>;
  };

  const payload: LowStockEvent = {
    event_id: 'event-uuid',
    business_id: 'business-uuid',
    store_id: 'store-uuid',
    product_id: 'product-uuid',
    current_quantity: 5,
    reorder_point: 10,
    is_out_of_stock: false,
    occurred_at: new Date(),
  };

  const admin = {
    id: 'admin-uuid',
  } as User;

  const managerUser = {
    id: 'manager-uuid',
  } as User;

  let getRepositoryMock: ReturnType<typeof jest.fn>;
  let notification_result: Notifications;

  beforeEach(async () => {
    queryBuilder = {
      innerJoin: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      getMany: jest.fn(),
    };

    getRepositoryMock = jest.fn().mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    });

    managerMock = {
      getRepository: getRepositoryMock,
    } as unknown as EntityManager;

    queryBuilder.innerJoin.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      isTransactionActive: false,
      manager: managerMock,
    };

    // Simulate the transaction state changes made by TypeORM.
    queryRunner.startTransaction.mockImplementation(() => {
      queryRunner.isTransactionActive = true;
      return Promise.resolve();
    });

    queryRunner.commitTransaction.mockImplementation(() => {
      queryRunner.isTransactionActive = false;
      return Promise.resolve();
    });

    queryRunner.rollbackTransaction.mockImplementation(() => {
      queryRunner.isTransactionActive = false;
      return Promise.resolve();
    });

    // DataSource returns the same queryRunner used by the tests.
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    notification_result = {
      id: 'notification-uuid',
      recipient_id: admin.id,
      is_read: false,
      created_at: new Date(),
      source_event_id: 'event-uuid',
    } as Notifications;

    notificationsService = {
      create: jest
        .fn<CreateNotification>()
        .mockResolvedValue(notification_result),
    };

    notificationsGateway = {
      emitToUser: jest.fn(),
    };

    logger = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        LowStockHandler,
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: NotificationsGateway,
          useValue: notificationsGateway,
        },
        {
          provide: Logger,
          useValue: logger,
        },
      ],
    }).compile();

    handler = module.get<LowStockHandler>(LowStockHandler);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  it('should notify every eligible recipient, commit transaction, and emit websocket events', async () => {
    queryBuilder.getMany.mockResolvedValue([admin, managerUser]);

    await handler.handle(payload);

    // Verify the handler obtained its query runner from DataSource.
    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);

    expect(queryRunner.connect).toHaveBeenCalledTimes(1);
    expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);

    expect(getRepositoryMock).toHaveBeenCalledWith(User);

    expect(queryBuilder.innerJoin).toHaveBeenCalledWith('user.role', 'role');

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'user.business_id = :business_id',
      { business_id: payload.business_id },
    );

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.deleted_at IS NULL',
    );

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(role.name = :adminRole OR (role.name = :managerRole AND user.store_id = :store_id))',
      {
        adminRole: UserRole.ADMIN,
        managerRole: UserRole.MANAGER,
        store_id: payload.store_id,
      },
    );

    expect(notificationsService.create).toHaveBeenCalledTimes(2);

    // Argument order: payload, EntityManager, recipient ID.
    expect(notificationsService.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        business_id: payload.business_id,
        source_event_id: payload.event_id,
        type: OutboxEventType.LOWSTOCK_DETECTED,
        title: 'Low Stock Alert',
        is_read: false,
      }),
      queryRunner.manager,
      admin.id,
    );

    expect(notificationsService.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        business_id: payload.business_id,
        source_event_id: payload.event_id,
        type: OutboxEventType.LOWSTOCK_DETECTED,
        title: 'Low Stock Alert',
        is_read: false,
      }),
      queryRunner.manager,
      managerUser.id,
    );

    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);

    // Verify gateway emitted events to all recipients after commit
    expect(notificationsGateway.emitToUser).toHaveBeenCalledTimes(2);
    expect(notificationsGateway.emitToUser).toHaveBeenCalledWith(
      admin.id,
      expect.any(Object),
    );
    expect(notificationsGateway.emitToUser).toHaveBeenCalledWith(
      managerUser.id,
      expect.any(Object),
    );
  });

  it('should create an out-of-stock alert when quantity is zero', async () => {
    queryBuilder.getMany.mockResolvedValue([admin]);

    await handler.handle({
      ...payload,
      current_quantity: 0,
      is_out_of_stock: true,
    });

    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Out of Stock Alert',
        message: 'A product is out of stock.',
      }),
      queryRunner.manager,
      admin.id,
    );

    expect(notificationsGateway.emitToUser).toHaveBeenCalledWith(
      admin.id,
      expect.objectContaining(notification_result),
    );
  });

  it('should commit and skip notification creation when no recipients exist', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});

    queryBuilder.getMany.mockResolvedValue([]);

    await handler.handle(payload);

    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(notificationsService.create).not.toHaveBeenCalled();
    expect(notificationsGateway.emitToUser).not.toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('should roll back and rethrow when notification creation fails', async () => {
    const error = new Error('Notification insert failed');

    queryBuilder.getMany.mockResolvedValue([admin, managerUser]);

    notificationsService.create
      .mockResolvedValueOnce({
        id: 'first-notification',
      } as Notifications)
      .mockRejectedValueOnce(error);

    await expect(handler.handle(payload)).rejects.toBe(error);

    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    expect(notificationsService.create).toHaveBeenCalledTimes(2);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(notificationsGateway.emitToUser).not.toHaveBeenCalled();
  });

  it('should roll back when recipient lookup fails', async () => {
    const error = new Error('Recipient lookup failed');

    queryBuilder.getMany.mockRejectedValue(error);

    await expect(handler.handle(payload)).rejects.toBe(error);

    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    expect(notificationsService.create).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(notificationsGateway.emitToUser).not.toHaveBeenCalled();
  });

  it('should release the query runner if connecting fails', async () => {
    const error = new Error('Database connection failed');

    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    queryRunner.connect.mockRejectedValue(error);

    await expect(handler.handle(payload)).rejects.toBe(error);

    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(notificationsGateway.emitToUser).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('should not attempt rollback if transaction was never active when an error occurs', async () => {
    const error = new Error('Pre-transaction failure');
    queryRunner.startTransaction.mockRejectedValue(error);
    queryRunner.isTransactionActive = false;

    await expect(handler.handle(payload)).rejects.toBe(error);

    expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(notificationsGateway.emitToUser).not.toHaveBeenCalled();
  });

  it('should verify correct query builder filters are applied for admin and manager roles', async () => {
    queryBuilder.getMany.mockResolvedValue([admin]);

    await handler.handle(payload);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(role.name = :adminRole OR (role.name = :managerRole AND user.store_id = :store_id))',
      {
        adminRole: UserRole.ADMIN,
        managerRole: UserRole.MANAGER,
        store_id: payload.store_id,
      },
    );
  });

  it('should handle malformed or missing payload identifiers gracefully and trigger rollback', async () => {
    const error = new Error('Invalid payload reference');
    queryBuilder.getMany.mockRejectedValue(error);

    const invalidPayload = {
      ...payload,
      business_id: '',
    };

    await expect(handler.handle(invalidPayload)).rejects.toBe(error);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
    expect(notificationsGateway.emitToUser).not.toHaveBeenCalled();
  });
});
