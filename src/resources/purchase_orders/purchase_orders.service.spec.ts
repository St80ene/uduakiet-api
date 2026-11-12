import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PurchaseOrdersService } from './purchase_orders.service';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase_order.entity';
import { PurchaseOrderItem } from './entities/purchase_order_item.entity';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      softRemove: jest.fn(),
    },
  };

  const mockPurchaseOrderRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const manager = mockQueryRunner.manager;

  beforeEach(async () => {
    jest.resetAllMocks();

    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

    manager.create.mockImplementation((_entity, data: PurchaseOrder) => ({
      ...data,
    }));

    manager.save.mockImplementation(
      (entity: typeof PurchaseOrder, data: Partial<PurchaseOrder>) => {
        if (entity === PurchaseOrder) {
          return {
            ...data,
            id: data.id ?? 'po-1',
          };
        }

        return data;
      },
    );

    manager.find.mockResolvedValue([]);
    manager.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: mockPurchaseOrderRepository,
        },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================
  // CREATE
  // ============================================================

  describe('create()', () => {
    const creator = { id: 'creator-1' };
    const store = { id: 'store-1' };

    const products = [
      { id: 'prod-1', name: 'Product A', business_id: 'biz-1' },
      { id: 'prod-2', name: 'Product B', business_id: 'biz-1' },
    ];

    const sources = [
      {
        product_id: 'prod-1',
        supplier_id: 'supp-A',
        is_primary: true,
        cost_price: 100,
      },
      {
        product_id: 'prod-2',
        supplier_id: 'supp-B',
        is_primary: true,
        cost_price: 250,
      },
    ];

    const suppliers = [
      { id: 'supp-A', business_id: 'biz-1' },
      { id: 'supp-B', business_id: 'biz-1' },
    ];

    const dto = {
      items: [
        { product_id: 'prod-1', quantity_requested: 4 },
        { product_id: 'prod-2', quantity_requested: 2 },
      ],
    };

    const setupSuccessfulCreation = () => {
      manager.findOne
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(store);

      manager.find
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce(sources)
        .mockResolvedValueOnce(suppliers);
    };

    it('should reject when businessId is missing', async () => {
      await expect(
        service.create(dto, 'creator-1', '', 'store-1'),
      ).rejects.toThrow(new BadRequestException('Business is required.'));

      expect(manager.findOne).not.toHaveBeenCalled();
    });

    it('should reject when destination store is missing', async () => {
      await expect(
        service.create(dto, 'creator-1', 'biz-1', ''),
      ).rejects.toThrow(
        new BadRequestException('A destination store is required.'),
      );
    });

    it('should reject when items are empty', async () => {
      await expect(
        service.create({ items: [] }, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(
        new BadRequestException(
          'A purchase order must contain at least one item.',
        ),
      );
    });

    it('should reject duplicate products', async () => {
      const duplicateDto = {
        items: [
          { product_id: 'prod-1', quantity_requested: 5 },
          { product_id: 'prod-1', quantity_requested: 2 },
        ],
      };

      await expect(
        service.create(duplicateDto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(
        new BadRequestException('Duplicate products found in line items.'),
      );
    });

    it('should reject when creator does not belong to the business', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(new NotFoundException('Authorized creator not found.'));

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject when destination store does not belong to the business', async () => {
      manager.findOne
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(null);

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(new NotFoundException('Store not found.'));
    });

    it('should reject when one or more products do not belong to the business', async () => {
      manager.findOne
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(store);

      manager.find.mockResolvedValueOnce([products[0]]);

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(
        new BadRequestException(
          'One or more products do not belong to this business.',
        ),
      );
    });

    it('should reject products without a primary supplier', async () => {
      manager.findOne
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(store);

      manager.find
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce([sources[0]]);

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(
        new BadRequestException('No primary supplier configured for: prod-2'),
      );
    });

    it('should reject when a product has multiple primary suppliers', async () => {
      manager.findOne
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(store);

      manager.find
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce([
          sources[0],
          { ...sources[0], supplier_id: 'supp-B' },
          sources[1],
        ]);

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when a configured supplier does not belong to the business', async () => {
      manager.findOne
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(store);

      manager.find
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce(sources)
        .mockResolvedValueOnce([suppliers[0]]);

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(
        new BadRequestException(
          'One or more configured suppliers do not belong to this business.',
        ),
      );
    });

    it('should reject invalid supplier cost', async () => {
      setupSuccessfulCreation();

      manager.find.mockReset();
      manager.find
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce([
          { ...sources[0], cost_price: -100 },
          sources[1],
        ])
        .mockResolvedValueOnce(suppliers);

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid requested quantity', async () => {
      const invalidDto = {
        items: [{ product_id: 'prod-1', quantity_requested: 0 }],
      };

      manager.findOne
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(store);

      manager.find
        .mockResolvedValueOnce([products[0]])
        .mockResolvedValueOnce([sources[0]])
        .mockResolvedValueOnce([suppliers[0]]);

      await expect(
        service.create(invalidDto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create separate draft purchase orders for different suppliers', async () => {
      setupSuccessfulCreation();

      const result = await service.create(dto, 'creator-1', 'biz-1', 'store-1');

      expect(result.message).toBe(
        '2 draft purchase orders created successfully.',
      );

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          supplier_id: 'supp-A',
          business_id: 'biz-1',
          store_id: 'store-1',
          created_by_id: 'creator-1',
          status: PurchaseOrderStatus.DRAFT,
          total_estimated_cost: 400,
        }),
      );

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          supplier_id: 'supp-B',
          total_estimated_cost: 500,
        }),
      );

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrderItem,
        expect.arrayContaining([
          expect.objectContaining({
            product_id: 'prod-1',
            quantity_requested: 4,
            estimated_unit_cost: 100,
            total_cost: 400,
            quantity_received: 0,
          }),
        ]),
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should group products belonging to the same supplier into one PO', async () => {
      manager.findOne
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(store);

      manager.find
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce([
          sources[0],
          { ...sources[1], supplier_id: 'supp-A' },
        ])
        .mockResolvedValueOnce([suppliers[0]]);

      await service.create(dto, 'creator-1', 'biz-1', 'store-1');

      expect(manager.save).toHaveBeenCalledTimes(2);
      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          supplier_id: 'supp-A',
          total_estimated_cost: 900,
        }),
      );
    });

    it('should rollback and wrap unexpected database errors', async () => {
      setupSuccessfulCreation();

      manager.save.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-1'),
      ).rejects.toThrow(
        new InternalServerErrorException('Unable to create purchase orders.'),
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  // ============================================================
  // UPDATE
  // ============================================================

  describe('update()', () => {
    const draftPo = {
      id: 'po-1',
      business_id: 'biz-1',
      supplier_id: 'supp-1',
      status: PurchaseOrderStatus.DRAFT,
      total_estimated_cost: 500,
      items: [
        {
          id: 'item-1',
          product_id: 'prod-1',
          quantity_requested: 5,
          quantity_received: 0,
          estimated_unit_cost: 100,
          total_cost: 500,
        },
      ],
    };

    it('should reject when purchase order does not exist', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.update('po-1', {}, 'biz-1')).rejects.toThrow(
        new NotFoundException('Purchase order not found.'),
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject editing a non-draft purchase order', async () => {
      manager.findOne.mockResolvedValueOnce({
        ...draftPo,
        status: PurchaseOrderStatus.APPROVED,
      });

      await expect(service.update('po-1', {}, 'biz-1')).rejects.toThrow(
        new BadRequestException('Only draft purchase orders can be edited.'),
      );
    });

    it('should reject when assigned supplier is invalid', async () => {
      manager.findOne
        .mockResolvedValueOnce(draftPo)
        .mockResolvedValueOnce(null);

      await expect(service.update('po-1', {}, 'biz-1')).rejects.toThrow(
        new BadRequestException(
          'The supplier assigned to this purchase order is invalid.',
        ),
      );
    });

    it('should reject duplicate products in updated items', async () => {
      manager.findOne
        .mockResolvedValueOnce(draftPo)
        .mockResolvedValueOnce({ id: 'supp-1' });

      await expect(
        service.update(
          'po-1',
          {
            items: [
              { product_id: 'prod-1', quantity_requested: 5 },
              { product_id: 'prod-1', quantity_requested: 3 },
            ],
          },
          'biz-1',
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Duplicate products found in purchase order items.',
        ),
      );
    });

    it('should reject products not supplied by the assigned supplier', async () => {
      manager.findOne
        .mockResolvedValueOnce(draftPo)
        .mockResolvedValueOnce({ id: 'supp-1' });

      manager.find.mockResolvedValueOnce([]);

      await expect(
        service.update(
          'po-1',
          {
            items: [{ product_id: 'prod-2', quantity_requested: 3 }],
          },
          'biz-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should preserve existing item cost and use supplier cost for new items', async () => {
      const purchaseOrder = {
        ...draftPo,
        items: [...draftPo.items],
      };

      manager.findOne
        .mockResolvedValueOnce(purchaseOrder)
        .mockResolvedValueOnce({ id: 'supp-1' });

      manager.find.mockResolvedValueOnce([
        { product_id: 'prod-1', cost_price: 150 },
        { product_id: 'prod-2', cost_price: 250 },
      ]);

      mockPurchaseOrderRepository.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.DRAFT,
        total_estimated_cost: 800,
      });

      await service.update(
        'po-1',
        {
          items: [
            { product_id: 'prod-1', quantity_requested: 3 },
            { product_id: 'prod-2', quantity_requested: 2 },
          ],
        },
        'biz-1',
      );

      expect(purchaseOrder.items[0].estimated_unit_cost).toBe(100);
      expect(purchaseOrder.items[0].total_cost).toBe(300);

      expect(manager.create).toHaveBeenCalledWith(
        PurchaseOrderItem,
        expect.objectContaining({
          product_id: 'prod-2',
          quantity_requested: 2,
          estimated_unit_cost: 250,
          total_cost: 500,
          quantity_received: 0,
        }),
      );

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          total_estimated_cost: 800,
        }),
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should not modify items when items are omitted', async () => {
      manager.findOne
        .mockResolvedValueOnce(draftPo) // Purchase order lookup
        .mockResolvedValueOnce({
          // Supplier lookup
          id: 'supp-1',
          business_id: 'biz-1',
        });

      mockPurchaseOrderRepository.findOne.mockResolvedValueOnce({
        id: 'po-1',
      });

      await service.update('po-1', {}, 'biz-1');

      expect(manager.find).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  // ============================================================
  // RECEIVE
  // ============================================================

  describe('receive()', () => {
    const sentPo = {
      id: 'po-1',
      business_id: 'biz-1',
      store_id: 'store-1',
      status: PurchaseOrderStatus.SENT_TO_SUPPLIER,
      items: [
        {
          id: 'item-1',
          product_id: 'prod-1',
          quantity_requested: 5,
          quantity_received: 0,
          estimated_unit_cost: 100,
          product: { id: 'prod-1', name: 'Product A' },
        },
      ],
    };

    const receiptDto = {
      items: [{ item_id: 'item-1', quantity_received: 5 }],
    };

    it('should reject when purchase order does not exist', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.receive('po-1', receiptDto, 'biz-1', 'user-1'),
      ).rejects.toThrow(new NotFoundException('Purchase order not found.'));
    });

    it('should reject receiving a PO that has not been sent to the supplier', async () => {
      manager.findOne.mockResolvedValueOnce({
        ...sentPo,
        status: PurchaseOrderStatus.APPROVED,
      });

      await expect(
        service.receive('po-1', receiptDto, 'biz-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a purchase order with no items', async () => {
      manager.findOne.mockResolvedValueOnce({
        ...sentPo,
        items: [],
      });

      await expect(
        service.receive('po-1', receiptDto, 'biz-1', 'user-1'),
      ).rejects.toThrow(
        new BadRequestException('Purchase order has no items.'),
      );
    });

    it('should reject an empty receipt', async () => {
      manager.findOne.mockResolvedValueOnce(sentPo);

      await expect(
        service.receive('po-1', { items: [] }, 'biz-1', 'user-1'),
      ).rejects.toThrow(
        new BadRequestException('Received items are required.'),
      );
    });

    it('should reject when receiver is not authorized', async () => {
      manager.findOne.mockResolvedValueOnce(sentPo).mockResolvedValueOnce(null);

      await expect(
        service.receive('po-1', receiptDto, 'biz-1', 'user-1'),
      ).rejects.toThrow(
        new NotFoundException('Authorized receiving user not found.'),
      );
    });

    it('should reject receipts that omit PO items', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          ...sentPo,
          items: [
            ...sentPo.items,
            {
              id: 'item-2',
              product_id: 'prod-2',
              quantity_requested: 2,
              product: { name: 'Product B' },
            },
          ],
        })
        .mockResolvedValueOnce({ id: 'user-1' });

      await expect(
        service.receive('po-1', receiptDto, 'biz-1', 'user-1'),
      ).rejects.toThrow(
        new BadRequestException(
          'All purchase order items must be included in the receipt.',
        ),
      );
    });

    it('should reject duplicate receipt items', async () => {
      manager.findOne
        .mockResolvedValueOnce(sentPo)
        .mockResolvedValueOnce({ id: 'user-1' });

      await expect(
        service.receive(
          'po-1',
          {
            items: [
              { item_id: 'item-1', quantity_received: 5 },
              { item_id: 'item-1', quantity_received: 5 },
            ],
          },
          'biz-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject receipt items that do not belong to the PO', async () => {
      manager.findOne
        .mockResolvedValueOnce(sentPo)
        .mockResolvedValueOnce({ id: 'user-1' });

      await expect(
        service.receive(
          'po-1',
          {
            items: [{ item_id: 'unknown-item', quantity_received: 5 }],
          },
          'biz-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject partial or invalid quantities', async () => {
      manager.findOne
        .mockResolvedValueOnce(sentPo)
        .mockResolvedValueOnce({ id: 'user-1' });

      await expect(
        service.receive(
          'po-1',
          {
            items: [{ item_id: 'item-1', quantity_received: 3 }],
          },
          'biz-1',
          'user-1',
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Product "Product A" must be received in full. Expected 5.',
        ),
      );
    });

    it('should reject an item that has already been received', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          ...sentPo,
          items: [
            {
              ...sentPo.items[0],
              quantity_received: 5,
            },
          ],
        })
        .mockResolvedValueOnce({ id: 'user-1' });

      await expect(
        service.receive('po-1', receiptDto, 'biz-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // REMOVE DRAFT
  // ============================================================

  describe('remove_draft()', () => {
    it('should reject when purchase order does not exist', async () => {
      manager.findOne.mockResolvedValueOnce(null);

      await expect(service.remove_draft('po-1', 'biz-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(manager.softRemove).not.toHaveBeenCalled();
    });

    it('should reject deleting a non-draft purchase order', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.APPROVED,
      });

      await expect(service.remove_draft('po-1', 'biz-1')).rejects.toThrow(
        new BadRequestException('Only draft purchase orders can be deleted.'),
      );

      expect(manager.softRemove).not.toHaveBeenCalled();
    });

    it('should soft-delete a draft purchase order', async () => {
      const draft = {
        id: 'po-1',
        status: PurchaseOrderStatus.DRAFT,
      };

      manager.findOne.mockResolvedValueOnce(draft);

      const result = await service.remove_draft('po-1', 'biz-1');

      expect(manager.softRemove).toHaveBeenCalledWith(PurchaseOrder, draft);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.message).toBe('Draft purchase order deleted successfully.');
    });
  });

  // ============================================================
  // PURCHASE ORDER TRANSITIONS
  // ============================================================

  describe('submitForApproval()', () => {
    it('should move a draft PO to pending approval', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.DRAFT,
        })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.PENDING_APPROVAL,
        });

      const result = await service.submitForApproval('po-1', 'biz-1', 'user-1');

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          status: PurchaseOrderStatus.PENDING_APPROVAL,
        }),
      );

      expect(result?.data?.status).toBe(PurchaseOrderStatus.PENDING_APPROVAL);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject submitting a non-draft PO', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.APPROVED,
      });

      await expect(
        service.submitForApproval('po-1', 'biz-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve()', () => {
    it('should move a pending PO to approved and record approver', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.PENDING_APPROVAL,
        })
        .mockResolvedValueOnce({ id: 'manager-1' })
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.APPROVED,
          approved_by_id: 'manager-1',
        });

      const result = await service.approve('po-1', 'biz-1', 'manager-1');

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          status: PurchaseOrderStatus.APPROVED,
          approved_by_id: 'manager-1',
        }),
      );

      expect(result?.data?.status).toBe(PurchaseOrderStatus.APPROVED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject approval when PO is not pending approval', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.DRAFT,
      });

      await expect(
        service.approve('po-1', 'biz-1', 'manager-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsSentToSupplier()', () => {
    it('should send an approved PO to its supplier', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'po-1',
          supplier_id: 'supp-1',
          status: PurchaseOrderStatus.APPROVED,
        })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({ id: 'supp-1' })
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.SENT_TO_SUPPLIER,
        });

      await service.markAsSentToSupplier('po-1', 'biz-1', 'user-1');

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          status: PurchaseOrderStatus.SENT_TO_SUPPLIER,
        }),
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject sending a PO that has not been approved', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.PENDING_APPROVAL,
      });

      await expect(
        service.markAsSentToSupplier('po-1', 'biz-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject sending when supplier is invalid', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'po-1',
          supplier_id: 'supp-1',
          status: PurchaseOrderStatus.APPROVED,
        })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce(null);

      await expect(
        service.markAsSentToSupplier('po-1', 'biz-1', 'user-1'),
      ).rejects.toThrow(
        new BadRequestException('The purchase order supplier is invalid.'),
      );
    });
  });

  describe('reject()', () => {
    it('should reject when rejection reason is missing', async () => {
      await expect(
        service.reject('po-1', 'biz-1', 'manager-1', '  '),
      ).rejects.toThrow(
        new BadRequestException('Rejection reason is required'),
      );

      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should return a rejected PO to draft status', async () => {
      manager.findOne
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.PENDING_APPROVAL,
        })
        .mockResolvedValueOnce({ id: 'manager-1' })
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.DRAFT,
        });

      await service.reject(
        'po-1',
        'biz-1',
        'manager-1',
        'Incorrect quantities',
      );

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          status: PurchaseOrderStatus.DRAFT,
        }),
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject a PO that is not pending approval', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.APPROVED,
      });

      await expect(
        service.reject('po-1', 'biz-1', 'manager-1', 'Incorrect quantities'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel()', () => {
    it('should reject cancellation without a reason', async () => {
      await expect(
        service.cancel('po-1', 'biz-1', 'user-1', ''),
      ).rejects.toThrow(
        new BadRequestException('Cancellation reason is required'),
      );
    });

    it.each([
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.APPROVED,
    ])('should cancel a PO with status %s', async (status) => {
      mockPurchaseOrderRepository.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status,
      });

      manager.findOne
        .mockResolvedValueOnce({
          id: 'po-1',
          status,
        })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.CANCELLED,
        });

      await service.cancel('po-1', 'biz-1', 'user-1', 'No longer required');

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          status: PurchaseOrderStatus.CANCELLED,
        }),
      );
    });

    it('should require supplier cancellation confirmation for sent POs', async () => {
      mockPurchaseOrderRepository.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.SENT_TO_SUPPLIER,
      });

      await expect(
        service.cancel(
          'po-1',
          'biz-1',
          'user-1',
          'Order no longer required',
          false,
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Supplier cancellation must be confirmed first',
        ),
      );
    });

    it('should cancel a sent PO when supplier cancellation is confirmed', async () => {
      mockPurchaseOrderRepository.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.SENT_TO_SUPPLIER,
      });

      manager.findOne
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.SENT_TO_SUPPLIER,
        })
        .mockResolvedValueOnce({ id: 'user-1' })
        .mockResolvedValueOnce({
          id: 'po-1',
          status: PurchaseOrderStatus.CANCELLED,
        });

      await service.cancel(
        'po-1',
        'biz-1',
        'user-1',
        'Supplier confirmed cancellation',
        true,
      );

      expect(manager.save).toHaveBeenCalledWith(
        PurchaseOrder,
        expect.objectContaining({
          status: PurchaseOrderStatus.CANCELLED,
        }),
      );
    });

    it('should reject cancellation of a received PO', async () => {
      mockPurchaseOrderRepository.findOne.mockResolvedValueOnce({
        id: 'po-1',
        status: PurchaseOrderStatus.RECEIVED,
      });

      await expect(
        service.cancel('po-1', 'biz-1', 'user-1', 'No longer required'),
      ).rejects.toThrow(
        new BadRequestException('This purchase order cannot be cancelled'),
      );
    });
  });
});
