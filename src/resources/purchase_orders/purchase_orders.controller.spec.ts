import { Test, TestingModule } from '@nestjs/testing';

import { PurchaseOrdersController } from './purchase_orders.controller';
import { PurchaseOrdersService } from './purchase_orders.service';

import {
  CancelPurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/update-purchase_order.dto';

import { PurchaseOrderPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

describe('PurchaseOrdersController', () => {
  let controller: PurchaseOrdersController;

  const mockPurchaseOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    receive: jest.fn(),
    remove_draft: jest.fn(),
    submitForApproval: jest.fn(),
    approve: jest.fn(),
    markAsSentToSupplier: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  };

  const businessId = 'biz-1';
  const storeId = 'store-1';
  const userId = 'user-1';
  const poId = 'po-1';

  const mockUser = {
    id: userId,
    businessId,
    storeId,
  } as AuthenticatedUser;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrdersController],
      providers: [
        {
          provide: PurchaseOrdersService,
          useValue: mockPurchaseOrdersService,
        },
      ],
    }).compile();

    controller = module.get<PurchaseOrdersController>(PurchaseOrdersController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // CREATE
  // ============================================================

  describe('create()', () => {
    it('should create a purchase order and pass authenticated user details', async () => {
      const dto = {
        items: [
          {
            product_id: 'product-1',
            quantity_requested: 5,
          },
        ],
      };

      const response = {
        status: true,
        message: '1 draft purchase order created successfully.',
        data: null,
      };

      mockPurchaseOrdersService.create.mockResolvedValue(response);

      await expect(controller.create(dto, mockUser)).resolves.toBe(response);

      expect(mockPurchaseOrdersService.create).toHaveBeenCalledWith(
        dto,
        userId,
        businessId,
        storeId,
      );

      expect(mockPurchaseOrdersService.create).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // FIND ALL
  // ============================================================

  describe('findAll()', () => {
    it('should retrieve purchase orders using pagination and authenticated user details', async () => {
      const paginationQuery = {
        page: 1,
        limit: 10,
        order: 'DESC',
      } as PurchaseOrderPaginationQueryDto;

      const response = {
        status: true,
        message: 'Purchase Orders retrieved successfully',
        data: {
          purchase_orders: [],
          meta: {
            totalItems: 0,
            itemsPerPage: 10,
            totalPages: 1,
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      };

      mockPurchaseOrdersService.findAll.mockResolvedValue(response);

      await expect(controller.findAll(paginationQuery, mockUser)).resolves.toBe(
        response,
      );

      expect(mockPurchaseOrdersService.findAll).toHaveBeenCalledWith(
        businessId,
        paginationQuery,
        storeId,
      );

      expect(mockPurchaseOrdersService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // FIND ONE
  // ============================================================

  describe('findOne()', () => {
    it('should retrieve a purchase order by ID', async () => {
      const response = {
        status: true,
        message: 'Purchase Order retrieved successfully',
        data: {
          id: poId,
        },
      };

      mockPurchaseOrdersService.findOne.mockResolvedValue(response);

      await expect(controller.findOne(poId, mockUser)).resolves.toBe(response);

      expect(mockPurchaseOrdersService.findOne).toHaveBeenCalledWith(
        poId,
        businessId,
        storeId,
      );

      expect(mockPurchaseOrdersService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // UPDATE
  // ============================================================

  describe('update()', () => {
    it('should update a purchase order and pass the correct arguments', async () => {
      const dto = {
        items: [
          {
            product_id: 'product-1',
            quantity_requested: 10,
          },
        ],
      } as UpdatePurchaseOrderDto;

      const response = {
        status: true,
        message: 'Purchase order updated successfully.',
        data: {
          id: poId,
        },
      };

      mockPurchaseOrdersService.update.mockResolvedValue(response);

      await expect(controller.update(poId, mockUser, dto)).resolves.toBe(
        response,
      );

      expect(mockPurchaseOrdersService.update).toHaveBeenCalledWith(
        poId,
        dto,
        businessId,
        storeId,
      );

      expect(mockPurchaseOrdersService.update).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // RECEIVE
  // ============================================================

  describe('receive()', () => {
    it('should receive a purchase order and pass receiver details', async () => {
      const dto = {
        items: [
          {
            item_id: 'po-item-1',
            quantity_received: 5,
          },
        ],
      };

      const response = {
        status: true,
        message: 'Purchase order received successfully.',
        data: {
          id: poId,
          status: 'RECEIVED',
        },
      };

      mockPurchaseOrdersService.receive.mockResolvedValue(response);

      await expect(controller.receive(poId, dto, mockUser)).resolves.toBe(
        response,
      );

      expect(mockPurchaseOrdersService.receive).toHaveBeenCalledWith(
        poId,
        dto,
        businessId,
        userId,
        storeId,
      );

      expect(mockPurchaseOrdersService.receive).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // REMOVE DRAFT
  // ============================================================

  describe('remove_draft()', () => {
    it('should delete a draft purchase order', async () => {
      const response = {
        status: true,
        message: 'Draft purchase order deleted successfully.',
        data: null,
      };

      mockPurchaseOrdersService.remove_draft.mockResolvedValue(response);

      await expect(controller.remove_draft(mockUser, poId)).resolves.toBe(
        response,
      );

      expect(mockPurchaseOrdersService.remove_draft).toHaveBeenCalledWith(
        poId,
        businessId,
      );

      expect(mockPurchaseOrdersService.remove_draft).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // SUBMIT FOR APPROVAL
  // ============================================================

  describe('submitForApproval()', () => {
    it('should submit a purchase order for approval', async () => {
      const response = {
        status: true,
        message: 'Purchase order moved to PENDING_APPROVAL successfully.',
        data: {
          id: poId,
          status: 'PENDING_APPROVAL',
        },
      };

      mockPurchaseOrdersService.submitForApproval.mockResolvedValue(response);

      await expect(controller.submitForApproval(poId, mockUser)).resolves.toBe(
        response,
      );

      expect(mockPurchaseOrdersService.submitForApproval).toHaveBeenCalledWith(
        poId,
        businessId,
        userId,
      );

      expect(mockPurchaseOrdersService.submitForApproval).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  // ============================================================
  // APPROVE
  // ============================================================

  describe('approve()', () => {
    it('should approve a purchase order', async () => {
      const response = {
        status: true,
        message: 'Purchase order moved to APPROVED successfully.',
        data: {
          id: poId,
          status: 'APPROVED',
        },
      };

      mockPurchaseOrdersService.approve.mockResolvedValue(response);

      await expect(controller.approve(poId, mockUser)).resolves.toBe(response);

      expect(mockPurchaseOrdersService.approve).toHaveBeenCalledWith(
        poId,
        businessId,
        userId,
      );

      expect(mockPurchaseOrdersService.approve).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // MARK AS SENT TO SUPPLIER
  // ============================================================

  describe('markAsSentToSupplier()', () => {
    it('should mark an approved purchase order as sent to supplier', async () => {
      const response = {
        status: true,
        message: 'Purchase order moved to SENT_TO_SUPPLIER successfully.',
        data: {
          id: poId,
          status: 'SENT_TO_SUPPLIER',
        },
      };

      mockPurchaseOrdersService.markAsSentToSupplier.mockResolvedValue(
        response,
      );

      await expect(
        controller.markAsSentToSupplier(poId, mockUser),
      ).resolves.toBe(response);

      expect(
        mockPurchaseOrdersService.markAsSentToSupplier,
      ).toHaveBeenCalledWith(poId, businessId, userId);

      expect(
        mockPurchaseOrdersService.markAsSentToSupplier,
      ).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // REJECT
  // ============================================================

  describe('reject()', () => {
    it('should reject a purchase order and pass the rejection reason', async () => {
      const payload = {
        reason: 'Incorrect quantities requested',
      };

      const response = {
        status: true,
        message: 'Purchase order moved to DRAFT successfully.',
        data: {
          id: poId,
          status: 'DRAFT',
        },
      };

      mockPurchaseOrdersService.reject.mockResolvedValue(response);

      await expect(controller.reject(poId, mockUser, payload)).resolves.toBe(
        response,
      );

      expect(mockPurchaseOrdersService.reject).toHaveBeenCalledWith(
        poId,
        businessId,
        userId,
        payload.reason,
      );

      expect(mockPurchaseOrdersService.reject).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // CANCEL
  // ============================================================

  describe('cancel()', () => {
    it('should cancel a purchase order and pass cancellation details', async () => {
      const payload = {
        reason: 'Procurement no longer required',
        supplier_cancellation_confirmed: true,
      } as CancelPurchaseOrderDto;

      const response = {
        status: true,
        message: 'Purchase order moved to CANCELLED successfully.',
        data: {
          id: poId,
          status: 'CANCELLED',
        },
      };

      mockPurchaseOrdersService.cancel.mockResolvedValue(response);

      await expect(controller.cancel(poId, mockUser, payload)).resolves.toBe(
        response,
      );

      expect(mockPurchaseOrdersService.cancel).toHaveBeenCalledWith(
        poId,
        businessId,
        userId,
        payload.reason,
        payload.supplier_cancellation_confirmed,
      );

      expect(mockPurchaseOrdersService.cancel).toHaveBeenCalledTimes(1);
    });
  });
});
