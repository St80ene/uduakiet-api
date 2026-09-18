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
      // Validate that the stock record does not already exist for the given product, business, and store.
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

      const product = await queryRunner.manager.findOne(Product, {
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

      const stock = manager.create(Stock, {
        product_id,
        business_id: businessId,
        store_id: storeId,
        initial_quantity,
      });

      await manager.save(Stock, stock);

      /**
       * ------------------------------------------------------------
       * CALCULATE NEW BALANCE
       * ------------------------------------------------------------
       */

      // create Stock movement ledger

      const stock_movement_ledger = manager.create(StockMovement, {
        stock_id: stock.id,
        business_id: businessId,
        created_by_id: id,
        type: StockMovementType.ADJUSTMENT,
        direction,
        quantity: initial_quantity,
        quantity_before: 0,
        quantity_after: initial_quantity,
        unit_cost_price: product.cost_price,
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

  async update(payload: UpdateStockDto, user: AuthenticatedUser) {
    // Validate context
    const { businessId, storeId, id } = user;

    const { product_id, physical_quantity, reason } = payload;

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const manager = queryRunner.manager;

    if (physical_quantity <= 0)
      throw new BadRequestException(
        'Current quantity must be greater than zero.',
      );

    try {
      // Validate that the stock record does exist for the given product, business, and store.

      const stock = await queryRunner.manager
        .createQueryBuilder(Stock, 'stock')
        .setLock('pessimistic_write')
        .where('stock.product_id = :productId', { productId: product_id })
        .andWhere('stock.business_id = :businessId', { businessId: businessId })
        .andWhere('stock.store_id = :storeId', { storeId: storeId })
        .getOne();

      if (!stock)
        throw new NotFoundException(
          `Stock with ID "${id}" could not be found.`,
        );

      // fetch product for price snapshots
      const product = await queryRunner.manager.findOne(Product, {
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

      const quantity_before = stock.current_quantity;

      const difference = physical_quantity - quantity_before;

      // Nothing changed.
      // // No movement needs to be recorded.
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

      // Update stock

      stock.current_quantity = physical_quantity;

      await manager.save(Stock, stock);

      // create Stock movement ledger
      const stock_movement_ledger = manager.create(StockMovement, {
        stock_id: stock.id,
        business_id: businessId,
        created_by_id: user.id,
        type: StockMovementType.ADJUSTMENT,
        direction,
        quantity,
        quantity_before: quantity_before,
        quantity_after: physical_quantity,
        unit_cost_price: product.cost_price,
        unit_selling_price: product.selling_price,
        reason,
      });

      await manager.save(StockMovement, stock_movement_ledger);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
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
        itemCount: stocks.length,
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
