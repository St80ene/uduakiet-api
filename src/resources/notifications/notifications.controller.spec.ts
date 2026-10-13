import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notifications } from './entities/notification.entity';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../common/enum/user_role.enum';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OutboxEventType } from '../outbox/entities/outbox_events.entity';
import { Role } from '../../auth/entities/role.entity';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    role: {
      id: 'role-uuid',
      name: UserRole.ADMIN,
      is_system: true,
      business_id: 'business-uuid',
      description: 'jkwjjwwnnow',
      created_at: new Date(),
      updated_at: new Date(),
    } as Role,
    businessId: 'business-uuid',
    storeId: 'store-uuid',
  } as AuthenticatedUser;

  const mockNotification: Notifications = {
    id: 'notification-uuid',
    source_event_id: 'event-uuid',
    recipient_id: mockUser.id,
    business_id: mockUser.businessId,
    type: OutboxEventType.LOWSTOCK_DETECTED,
    title: 'Low Stock Alert',
    message: 'A product is running low on stock.',
    data: {},
    is_read: false,
    created_at: new Date(),
  } as Notifications;

  beforeEach(async () => {
    const mockNotificationsService = {
      findAllForRecipient: jest.fn(),
      getUnreadCount: jest.fn(),
      markAllAsRead: jest.fn(),
      markAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService =
      module.get<jest.Mocked<NotificationsService>>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated notifications for the current user with default or custom pagination', async () => {
      const paginatedResult = {
        data: [mockNotification],
        total: 1,
        page: 1,
        limit: 20,
      };

      notificationsService.findAllForRecipient.mockResolvedValue(
        paginatedResult,
      );

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toEqual(paginatedResult);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(notificationsService.findAllForRecipient).toHaveBeenCalledWith(
        mockUser.id,
        1,
        20,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread notifications for the current user', async () => {
      notificationsService.getUnreadCount.mockResolvedValue(4);

      const count = await controller.getUnreadCount(mockUser);

      expect(count).toBe(4);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for the current user', async () => {
      const updateResult = { updated: 3 };
      notificationsService.markAllAsRead.mockResolvedValue(updateResult);

      const result = await controller.markAllAsRead(mockUser);

      expect(result).toEqual(updateResult);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a specific notification as read for the current user', async () => {
      const updatedNotification = {
        ...mockNotification,
        is_read: true,
      } as Notifications;

      notificationsService.markAsRead.mockResolvedValue(updatedNotification);

      const result = await controller.markAsRead('notification-uuid', mockUser);

      expect(result).toEqual(updatedNotification);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        'notification-uuid',
        mockUser.id,
      );
    });
  });
});
