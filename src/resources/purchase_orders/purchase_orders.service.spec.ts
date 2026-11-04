import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase_orders.service';
import { PurchaseOrder } from './entities/purchase_order.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('PurchaseOrdersService - create()', () => {
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
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(PurchaseOrder),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Initial Structural Validations', () => {
    it('should throw BadRequestException if businessId is missing', async () => {
      await expect(
        service.create(
          {
            items: [{ product_id: 'prod-1', quantity_requested: 5 }],
          },
          'creator-1',
          '',
        ),
      ).rejects.toThrow(new BadRequestException('Business is required.'));
    });

    it('should throw BadRequestException if items array is empty', async () => {
      await expect(
        service.create({ items: [] }, 'creator-1', 'biz-1'),
      ).rejects.toThrow(
        new BadRequestException('Must contain at least one item.'),
      );
    });

    it('should throw BadRequestException if duplicate products are provided in line items', async () => {
      const dto = {
        items: [
          { product_id: 'prod-1', quantity_requested: 5 },
          { product_id: 'prod-1', quantity_requested: 2 },
        ],
      };

      await expect(service.create(dto, 'creator-1', 'biz-1')).rejects.toThrow(
        new BadRequestException('Duplicate products found in line items.'),
      );
    });
  });

  describe('Tenant Security & Entity Lookups', () => {
    it('should throw NotFoundException if authorized creator is not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null); // Creator lookup

      const dto = {
        items: [{ product_id: 'prod-1', quantity_requested: 5 }],
      };

      await expect(service.create(dto, 'creator-1', 'biz-1')).rejects.toThrow(
        new NotFoundException('Authorized creator not found.'),
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if assigned store execution node is not found', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 'creator-1' }) // Creator found
        .mockResolvedValueOnce(null); // Store not found

      const dto = {
        items: [{ product_id: 'prod-1', quantity_requested: 5 }],
      };

      await expect(
        service.create(dto, 'creator-1', 'biz-1', 'store-99'),
      ).rejects.toThrow(
        new NotFoundException('Assigned business execution node not found.'),
      );
    });
  });

  describe('Automated Sourcing Engine (Primary Matrix)', () => {
    it('should throw BadRequestException if primary supplier configuration is missing for any product', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        id: 'creator-1',
      }); // Creator
      mockQueryRunner.manager.find.mockResolvedValueOnce([
        { product_id: 'prod-1', supplier_id: 'supp-1', is_primary: true },
        // prod-2 has no primary source mapping returned
      ]);

      const dto = {
        items: [
          { product_id: 'prod-1', quantity_requested: 5 },
          { product_id: 'prod-2', quantity_requested: 3 },
        ],
      };

      await expect(service.create(dto, 'creator-1', 'biz-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully split and group items by primary vendor and map contracted costs', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        id: 'creator-1',
      }); // Creator
      mockQueryRunner.manager.find.mockResolvedValueOnce([
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
      ]);
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockResolvedValue({ id: 'saved-po-id' });

      const dto = {
        items: [
          { product_id: 'prod-1', quantity_requested: 4 },
          { product_id: 'prod-2', quantity_requested: 2 },
        ],
      };

      const result = await service.create(dto, 'creator-1', 'biz-1');

      expect(result).toBeDefined();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('Transaction Rollback on Unexpected Errors', () => {
    it('should roll back transaction and throw InternalServerErrorException if manager.save fails unexpectedly', async () => {
      // 1. Mock successful creator lookup
      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        id: 'creator-1',
      });

      // 2. Mock successful supplier source lookup
      mockQueryRunner.manager.find.mockResolvedValueOnce([
        {
          product_id: 'prod-1',
          supplier_id: 'supp-A',
          is_primary: true,
          cost_price: 100,
        },
      ]);

      // 3. Mock entity creation return value
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);

      // 4. Force manager.save to fail unexpectedly
      mockQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('Database connection lost'),
      );

      const dto = {
        items: [{ product_id: 'prod-1', quantity_requested: 5 }],
      };

      // 5. Assert that InternalServerErrorException is thrown and rollback was called
      await expect(service.create(dto, 'creator-1', 'biz-1')).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
