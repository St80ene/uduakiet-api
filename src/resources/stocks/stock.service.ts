import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Stock } from './entities/stock.entity';

import { DashboardCard } from '../dashboard/interfaces/initial_interface';

import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';

import {
  PaginationMeta,
  STOCK_SORT_FIELDS,
  StockPaginationQueryDto,
} from '../../common/dto/pagination-query.dto';

import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CreateStockDto } from './dto/create-stock.dto';
import {
  StockMovement,
  StockMovementDirection,
  StockMovementType,
} from '../stock_movements/entities/stock_movement.entity';
import { Product } from '../products/entities/product.entity';
import { UpdateStockDto } from './dto/update-stock.dto';
import {
  LowStockEvent,
  OutboxEvent,
  OutboxEventAggregateType,
  OutboxEventStatus,
  OutboxEventType,
} from '../outbox/entities/outbox_events.entity';
import { Store } from '../stores/entities/store.entity';

interface StockByUnit {
  unit: string;
  quantity: number;
}

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    payload: CreateStockDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<Stock>> {
    const { businessId, storeId, id } = user;
    const { product_id, initial_quantity, direction } = payload;
    const initialUnitCost = (
      payload as CreateStockDto & { initial_unit_cost?: string }
    ).initial_unit_cost;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;

    try {
      const existingStock = await manager.findOne(Stock, {
        where: {
          product_id: product_id,
          business_id: businessId,
          store_id: storeId,
        },
      });

      if (existingStock) {
        throw new BadRequestException(
          'Stock record already exists for this product in the specified store.',
        );
      }

      if (initial_quantity <= 0) {
        throw new BadRequestException(
          'Current quantity must be greater than zero.',
        );
      }

      const product = await manager.findOne(Product, {
        where: {
          id: product_id,
          business_id: businessId,
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID "${product_id}" could not be found.`,
        );
      }

      /**
       * Money is stored in minor currency units (for example, kobo).
       */
      if (
        typeof initialUnitCost !== 'string' ||
        !/^\d+$/.test(initialUnitCost)
      ) {
        throw new BadRequestException(
          'A valid initial unit cost in minor currency units is required.',
        );
      }

      const initialCost = BigInt(initialUnitCost);

      const stock = manager.create(Stock, {
        product_id,
        business_id: businessId,
        store_id: storeId,
        current_quantity: initial_quantity,
        average_unit_cost: initialCost.toString(),
      });

      await manager.save(Stock, stock);

      const stock_movement_ledger = manager.create(StockMovement, {
        stock_id: stock.id,
        business_id: businessId,
        created_by_id: id,
        type: StockMovementType.ADJUSTMENT,
        direction,
        quantity: initial_quantity,
        quantity_before: 0,
        quantity_after: initial_quantity,
        unit_cost_price: initialCost.toString(),
        unit_selling_price: product.selling_price,
      });

      await manager.save(StockMovement, stock_movement_ledger);

      await queryRunner.commitTransaction();
      return successResponse('Stock created successfully', stock);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    payload: UpdateStockDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<Stock>> {
    const { businessId, storeId, id: userId } = user;
    const { product_id, physical_quantity, reason } = payload;

    if (!Number.isSafeInteger(physical_quantity) || physical_quantity < 0) {
      throw new BadRequestException(
        'Physical quantity must be a non-negative whole number.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      /**
       * 1. VALIDATE PRODUCT
       */
      const product = await manager.findOne(Product, {
        where: {
          id: product_id,
          business_id: businessId,
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID "${product_id}" could not be found.`,
        );
      }

      /**
       * 2. FIND AND LOCK STOCK BALANCE
       */
      const driverType = queryRunner.dataSource.driver.options.type;
      const supportsLocks = driverType !== 'better-sqlite3';

      let stock = await manager.findOne(Stock, {
        where: {
          product_id,
          store_id: storeId,
          business_id: businessId,
        },
        ...(supportsLocks
          ? { lock: { mode: 'pessimistic_write' as const } }
          : {}),
      });

      if (!stock) {
        stock = manager.create(Stock, {
          product_id,
          store_id: storeId,
          business_id: businessId,
          current_quantity: 0,
        });

        stock = await manager.save(Stock, stock);
      }

      /**
       * 3. VALIDATE THE EXISTING INVENTORY VALUATION
       */
      if (
        typeof stock.average_unit_cost !== 'string' ||
        !/^\d+$/.test(stock.average_unit_cost)
      ) {
        throw new BadRequestException(
          'This stock record has an invalid average cost and must be reconciled.',
        );
      }

      const averageUnitCost = BigInt(stock.average_unit_cost);
      const quantityBefore = stock.current_quantity;

      if (quantityBefore > 0 && averageUnitCost === 0n) {
        throw new BadRequestException(
          'This stock has quantity but no recorded cost. Reconcile its opening valuation before adjusting it.',
        );
      }

      if (quantityBefore === 0 && physical_quantity > 0) {
        throw new BadRequestException(
          'You cannot add opening stock through a physical-count adjustment without a known unit cost. Use the opening-stock flow.',
        );
      }

      /**
       * 4. CALCULATE PHYSICAL COUNT DIFFERENCE
       */
      const quantityAfter = physical_quantity;
      const difference = quantityAfter - quantityBefore;

      if (difference === 0) {
        await queryRunner.commitTransaction();

        return successResponse(
          'Stock count matches the system quantity. No adjustment was made.',
          stock,
        );
      }

      const direction =
        difference > 0 ? StockMovementDirection.IN : StockMovementDirection.OUT;

      const quantity = Math.abs(difference);

      /**
       * 4. UPDATE STOCK BALANCE
       */
      stock.current_quantity = quantityAfter;
      stock.average_unit_cost =
        quantityAfter === 0 ? '0' : averageUnitCost.toString();

      await manager.save(Stock, stock);

      /**
       * 5. RECORD STOCK MOVEMENT
       */
      await manager.save(
        StockMovement,
        manager.create(StockMovement, {
          stock_id: stock.id,
          business_id: businessId,
          created_by_id: userId,
          type: StockMovementType.ADJUSTMENT,
          direction,
          quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          unit_selling_price: product.selling_price,
          unit_cost_price: averageUnitCost.toString(),
          reason,
        }),
      );

      /**
       * 6. DETECT LOW-STOCK TRANSITION
       */
      const reorderLevel = product.default_reorder_point ?? 5;

      const crossedReorderLevel =
        direction === StockMovementDirection.OUT &&
        quantityBefore > reorderLevel &&
        quantityAfter <= reorderLevel;

      const hitZero = quantityBefore > 0 && quantityAfter === 0;

      if (crossedReorderLevel || hitZero) {
        const store = await manager.findOne(Store, {
          where: {
            id: storeId,
            business_id: businessId,
          },
          select: {
            id: true,
            name: true,
          },
        });

        const eventPayload: Partial<LowStockEvent> = {
          business_id: businessId,
          store_id: stock.store_id,
          product_id: product.id,
          current_quantity: quantityAfter,
          reorder_point: reorderLevel,
          product_name: product.name,
          store_name: store?.name ?? '',
          is_out_of_stock: quantityAfter === 0,
        };

        /**
         * 7. PUBLISH EVENT TO OUTBOX
         *
         * The outbox record is committed atomically with the
         * stock balance and movement ledger.
         */
        await manager.save(
          OutboxEvent,
          manager.create(OutboxEvent, {
            event_type: OutboxEventType.LOWSTOCK_DETECTED,
            aggregate_id: stock.id,
            aggregate_type: OutboxEventAggregateType.STOCKS,
            business_id: businessId,
            store_id: stock.store_id,
            payload: eventPayload,
            status: OutboxEventStatus.PENDING,
            attempts: 0,
            available_at: new Date(),
            processed_at: null,
            last_error: null,
          }),
        );
      }

      await queryRunner.commitTransaction();

      return successResponse(
        'Stock level adjusted successfully via manual count.',
        stock,
      );
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves current stock balances.
   *
   * This queries Stock, not StockMovement.
   */
  async findAll(
    user: AuthenticatedUser,
    paginationQuery: StockPaginationQueryDto,
  ): Promise<
    ApiResponse<{
      stocks: Stock[];
      meta: PaginationMeta;
    }>
  > {
    const { businessId, storeId } = user;
    const {
      page: pageNumber,
      limit: limitNumber,
      skip,
    } = getPaginationOptions(paginationQuery);

    const {
      search,
      order = 'DESC',
      sortBy = 'updated_at',
      product_id,
      store_id,
    } = paginationQuery;

    const sortColumn =
      STOCK_SORT_FIELDS[sortBy] ?? STOCK_SORT_FIELDS.updated_at;

    const sortOrder: 'ASC' | 'DESC' =
      order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.store', 'store')
      .where('stock.business_id = :businessId', {
        businessId: businessId,
      });

    if (user.storeId) {
      queryBuilder.andWhere('stock.store_id = :currentStoreId', {
        currentStoreId: storeId,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        `
        (
          LOWER(product.name) LIKE LOWER(:search)
        )
        `,
        {
          search: `%${search}%`,
        },
      );
    }

    if (product_id) {
      queryBuilder.andWhere('stock.product_id = :productId', {
        productId: product_id,
      });
    }

    /**
     * A store filter may be supplied for business-wide users.
     * Store-assigned users are restricted to their own store.
     */
    if (store_id) {
      if (user.storeId && store_id !== user.storeId) {
        throw new BadRequestException(
          'You cannot access stock belonging to another store.',
        );
      }

      queryBuilder.andWhere('stock.store_id = :storeId', {
        storeId: store_id,
      });
    }

    queryBuilder.orderBy(sortColumn, sortOrder).skip(skip).take(limitNumber);

    const [stocks, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limitNumber);

    return successResponse('Stock balances retrieved successfully', {
      stocks,
      meta: {
        totalItems,
        itemsPerPage: limitNumber,
        totalPages,
        currentPage: pageNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  }

  /**
   * Retrieves one current stock balance.
   */
  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<Stock>> {
    const { businessId, storeId } = user;

    const stock = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.store', 'store')
      .leftJoinAndSelect('stock.movements', 'movements')
      .leftJoinAndSelect('stock.business', 'business')
      .where('stock.id = :id', { id })
      .andWhere('stock.business_id = :businessId', {
        businessId: businessId,
      });

    if (storeId) {
      stock.andWhere('stock.store_id = :storeId', {
        storeId: storeId,
      });
    }

    const stockRecord = await stock.getOne();

    if (!stockRecord) {
      throw new NotFoundException('Stock balance not found.');
    }

    return successResponse('Stock balance retrieved successfully', stockRecord);
  }

  /**
   * Returns warehouse/inventory metrics.
   */
  async getWarehouseMetrics(user: AuthenticatedUser): Promise<DashboardCard[]> {
    const { businessId, storeId } = user;

    const queryBuilder = this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.product', 'product')
      .where('stock.business_id = :businessId', {
        businessId,
      })
      .andWhere('product.deleted_at IS NULL');

    if (storeId) {
      queryBuilder.andWhere('stock.store_id = :storeId', {
        storeId,
      });
    }

    const result = await queryBuilder
      .select('COALESCE(SUM(stock.current_quantity), 0)', 'total_stock')
      .addSelect(
        `
      COALESCE(
        SUM(
          CASE
            WHEN stock.current_quantity <= product.default_reorder_point
            THEN 1
            ELSE 0
          END
        ),
        0
      )
      `,
        'low_stock',
      )
      .addSelect(
        `
      COALESCE(
        SUM(
          CASE
            WHEN stock.current_quantity = 0
            THEN 1
            ELSE 0
          END
        ),
        0
      )
      `,
        'out_of_stock',
      )
      .addSelect(
        `
      COALESCE(
        SUM(stock.current_quantity * stock.average_unit_cost),
        0
      )
      `,
        'inventory_value',
      )
      .getRawOne<{
        total_stock: string;
        low_stock: string;
        out_of_stock: string;
        inventory_value: string;
      }>();

    return [
      {
        id: 'total-stock',
        title: 'Total Stock',
        value: Number(result?.total_stock ?? 0),
        severity: 'success',
      },
      {
        id: 'low-stock',
        title: 'Low Stock',
        value: Number(result?.low_stock ?? 0),
        severity: Number(result?.low_stock ?? 0) > 0 ? 'warning' : 'success',
      },
      {
        id: 'out-of-stock',
        title: 'Out of Stock',
        value: Number(result?.out_of_stock ?? 0),
        severity: Number(result?.out_of_stock ?? 0) > 0 ? 'danger' : 'success',
      },
      {
        id: 'inventory-value',
        title: 'Inventory Value',
        value: Number(result?.inventory_value ?? 0),
        severity: 'success',
      },
    ];
  }

  async getTotalStockByUnit(user: AuthenticatedUser): Promise<StockByUnit[]> {
    const query = this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.product', 'product')
      .select('product.uom_display_name', 'unit')
      .addSelect('SUM(stock.current_quantity)', 'total_quantity')
      .where('stock.business_id = :businessId', {
        businessId: user.businessId,
      })
      .andWhere('product.deleted_at IS NULL')
      .groupBy('product.uom_display_name');

    if (user?.storeId) {
      query.andWhere('stock.store_id = :storeId', { storeId: user.storeId });
    }

    const results = await query.getRawMany<{
      unit: string;
      total_quantity: string;
    }>();

    return results.map((item) => {
      const unit = item.unit.toLowerCase();
      let quantity = Number(item.total_quantity);

      // Convert base units to their display units.
      if (unit === 'kg' || unit === 'l') {
        quantity /= 1000;
      }

      return {
        unit: item.unit,
        quantity: Number(quantity.toFixed(3)),
      };
    });
  }
}
