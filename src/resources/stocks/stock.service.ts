import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { LowStockEvent, Stock } from './entities/stock.entity';

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
import { ProductSource } from '../product_sources/entities/product_source.entity';

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
       * ------------------------------------------------------------
       * RESOLVE COST FOR BASE INITIAL ADJUSTMENT
       * ------------------------------------------------------------
       */
      const cheapestSource = await manager.findOne(ProductSource, {
        where: { product_id: product.id, business_id: businessId },
        order: { cost_price: 'ASC' },
      });

      const resolvedCostPrice = cheapestSource
        ? Number(cheapestSource.cost_price)
        : Number((product.selling_price * 0.75).toFixed(2));

      const stock = manager.create(Stock, {
        product_id,
        business_id: businessId,
        store_id: storeId,
        current_quantity: initial_quantity, // Initializing state values safely
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
        unit_cost_price: resolvedCostPrice, // 🌟 FIXED: References resolved vendor cost
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
    const { businessId, storeId } = user;
    const { product_id, physical_quantity, reason } = payload;

    if (!Number.isInteger(physical_quantity) || physical_quantity < 0) {
      throw new BadRequestException(
        'Physical quantity must be a non-negative whole number.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;

    let lowStockEvent: LowStockEvent | null = null;
    let response: ApiResponse<Stock>;

    try {
      /**
       * 1. VALIDATE PRODUCT (belongs to business, not soft-deleted)
       */
      const product = await manager.findOne(Product, {
        where: { id: product_id, business_id: businessId },
      });
      if (!product) {
        throw new NotFoundException(
          `Product with ID "${product_id}" could not be found.`,
        );
      }

      /**
       * 2. LOCK OR CREATE THE BALANCE ROW
       */
      const driverType = queryRunner.dataSource.driver.options.type;

      // Fixed condition logic: SQLite doesn't support select-for-update locks, MySQL and Postgres do.
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
        stock = await manager.save(
          manager.create(Stock, {
            product_id,
            store_id: storeId,
            business_id: businessId,
            current_quantity: 0,
          }),
        );
      }

      /**
       * 3. QUANTITY DIFFERENCE
       */
      const quantity_before = stock.current_quantity;
      const difference = physical_quantity - quantity_before;

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
       * 4. UPDATE BALANCE + WRITE LEDGER ENTRY
       */
      stock.current_quantity = physical_quantity;
      await manager.save(Stock, stock);

      await manager.save(
        StockMovement,
        manager.create(StockMovement, {
          stock_id: stock.id,
          business_id: businessId,
          created_by_id: user.id,
          type: StockMovementType.ADJUSTMENT,
          direction,
          quantity,
          quantity_before,
          quantity_after: physical_quantity,
          unit_selling_price: product.selling_price,
          reason,
        }),
      );

      /**
       * 5. DETECT REORDER-LEVEL CROSSING (reached or passed, downward only)
       */
      const crossedReorderLevel =
        direction === StockMovementDirection.OUT &&
        quantity_before > (product.default_reorder_point ?? 5) &&
        physical_quantity <= (product.default_reorder_point ?? 5);

      if (crossedReorderLevel) {
        lowStockEvent = {
          business_id: businessId,
          store_id: stock.store_id,
          product_id: product.id,
          current_quantity: physical_quantity,
          reorder_level: product.default_reorder_point ?? 5,
          is_out_of_stock: physical_quantity === 0,
        };
      }

      await queryRunner.commitTransaction();

      response = successResponse(
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

    // 6. PUBLISH AFTER COMMIT
    if (lowStockEvent) {
      // this.eventEmitter.emit('stock.low', lowStockEvent);
    }

    return response;
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
      .select('COALESCE(SUM(stock.quantity), 0)', 'totalStock')
      .addSelect(
        `
        COALESCE(
          SUM(
            CASE
              WHEN stock.quantity <= stock.reorder_level
              THEN 1
              ELSE 0
            END
          ),
          0
        )
        `,
        'lowStock',
      )
      .addSelect(
        `
        COALESCE(
          SUM(
            CASE
              WHEN stock.quantity = 0
              THEN 1
              ELSE 0
            END
          ),
          0
        )
        `,
        'outOfStock',
      )
      .addSelect(
        `
        COALESCE(
          SUM(stock.quantity * product.cost_price),
          0
        )
        `,
        'inventoryValue',
      )
      .getRawOne<{
        totalStock: string;
        lowStock: string;
        outOfStock: string;
        inventoryValue: string;
      }>();

    return [
      {
        id: 'total-stock',
        title: 'Total Stock',
        value: Number(result?.totalStock ?? 0),
        severity: 'success',
      },
      {
        id: 'low-stock',
        title: 'Low Stock',
        value: Number(result?.lowStock ?? 0),
        severity: Number(result?.lowStock ?? 0) > 0 ? 'warning' : 'success',
      },
      {
        id: 'out-of-stock',
        title: 'Out of Stock',
        value: Number(result?.outOfStock ?? 0),
        severity: Number(result?.outOfStock ?? 0) > 0 ? 'danger' : 'success',
      },
    ];
  }
}
