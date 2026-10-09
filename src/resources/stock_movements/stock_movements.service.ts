import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Brackets, Repository } from 'typeorm';
import { StockMovement } from './entities/stock_movement.entity';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';
import {
  PaginationMeta,
  STOCK_MOVEMENT_SORT_FIELDS,
  StockMovementPaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a stock movement and updates the corresponding
   * current stock balance atomically.
   */

  /**
   * Creates multiple stock movements atomically.
   */

  async findAll(
    user: AuthenticatedUser,
    query: StockMovementPaginationQueryDto,
  ): Promise<
    ApiResponse<{
      stock_movements: StockMovement[];
      meta: PaginationMeta;
    }>
  > {
    const { businessId, storeId } = user;

    const {
      page: pageNumber,
      limit: limitNumber,
      skip,
    } = getPaginationOptions(query);

    const { search, order = 'DESC', sortBy = 'created_at' } = query;

    const sortColumn =
      STOCK_MOVEMENT_SORT_FIELDS[sortBy] || 'stock_movements.created_at';

    const sortOrder: 'ASC' | 'DESC' =
      order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.stockMovementRepository
      .createQueryBuilder('stock_movements')
      .leftJoinAndSelect('stock_movements.stock', 'stock')
      .leftJoinAndSelect('stock_movements.created_by', 'createdBy')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.store', 'store')
      .where('stock_movements.business_id = :businessId', {
        businessId,
      });

    if (storeId) {
      queryBuilder.andWhere('stock.store_id = :storeId', {
        storeId,
      });
    }

    if (search) {
      const trimmedSearch = search.trim();
      const isNumeric = !isNaN(Number(trimmedSearch)) && trimmedSearch !== '';
      const numericValue = isNumeric ? Number(trimmedSearch) : null;
      /**
       * Retrieves all stock movements belonging to the
       * authenticated user's business.
       *
       * Optionally restricted to the user's current store.
       */
      // Use Brackets to safely wrap search OR conditions so they don't break tenant isolation
      queryBuilder.andWhere(
        new Brackets((qb) => {
          // Text-based searches
          qb.where('LOWER(stock_movements.type) LIKE LOWER(:search)', {
            search: `%${trimmedSearch}%`,
          })
            .orWhere('LOWER(stock_movements.direction) LIKE LOWER(:search)', {
              search: `%${trimmedSearch}%`,
            })
            .orWhere('LOWER(product.name) LIKE LOWER(:search)', {
              search: `%${trimmedSearch}%`,
            })
            .orWhere('LOWER(store.name) LIKE LOWER(:search)', {
              search: `%${trimmedSearch}%`,
            })
            .orWhere('LOWER(createdBy.email) LIKE LOWER(:search)', {
              search: `%${trimmedSearch}%`,
            })
            .orWhere('LOWER(stock_movements.reason) LIKE LOWER(:search)', {
              search: `%${trimmedSearch}%`,
            });

          // If the user inputs a valid number, perform index-friendly exact numeric matches
          // instead of expensive string casting/full-table scans.
          if (isNumeric && numericValue !== null) {
            qb.orWhere('stock_movements.quantity = :numericValue', {
              numericValue,
            })
              .orWhere('stock_movements.quantity_before = :numericValue', {
                numericValue,
              })
              .orWhere('stock_movements.quantity_after = :numericValue', {
                numericValue,
              })
              .orWhere('stock_movements.unit_cost_price = :numericValue', {
                numericValue,
              })
              .orWhere('stock_movements.unit_selling_price = :numericValue', {
                numericValue,
              });
          }
        }),
      );
    }

    const [movements, totalItems] = await queryBuilder
      .orderBy(sortColumn, sortOrder)
      .skip(skip)
      .take(limitNumber)
      .getManyAndCount();

    const totalPages = Math.ceil(totalItems / limitNumber);

    return successResponse('Stock movements retrieved successfully', {
      stock_movements: movements,
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
   * Retrieves one stock movement.
   */
  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<StockMovement>> {
    const { businessId, storeId } = user;

    const queryBuilder = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.stock', 'stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.store', 'store')
      .leftJoinAndSelect('movement.created_by', 'createdBy')
      .where('movement.id = :id', { id })
      .andWhere('movement.business_id = :businessId', {
        businessId,
      });

    if (storeId) {
      queryBuilder.andWhere('stock.store_id = :storeId', {
        storeId,
      });
    }

    const movement = await queryBuilder.getOne();

    if (!movement) {
      throw new NotFoundException(
        `Stock movement with ID "${id}" could not be found.`,
      );
    }

    return successResponse('Stock movement retrieved successfully', movement);
  }

  /**
   * Retrieves the movement history for a specific stock balance.
   */
  async findByStock(
    stockId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<StockMovement[]>> {
    const { businessId, storeId } = user;

    const queryBuilder = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.stock', 'stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.store', 'store')
      .leftJoinAndSelect('movement.created_by', 'createdBy')
      .where('movement.stock_id = :stockId', {
        stockId,
      })
      .andWhere('movement.business_id = :businessId', {
        businessId,
      });

    if (storeId) {
      queryBuilder.andWhere('stock.store_id = :storeId', {
        storeId,
      });
    }

    const movements = await queryBuilder
      .orderBy('movement.created_at', 'DESC')
      .getMany();

    return successResponse(
      'Stock movement history retrieved successfully',
      movements,
    );
  }

  /**
   * Retrieves movement history for a product.
   *
   * Because a product can exist in multiple stores, the result may contain
   * movements from multiple stock balances for business-level users.
   *
   * Store-assigned users are restricted to their own store.
   */
  async findByProduct(
    productId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<StockMovement[]>> {
    const { businessId, storeId } = user;

    const queryBuilder = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.stock', 'stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.store', 'store')
      .leftJoinAndSelect('movement.created_by', 'createdBy')
      .where('stock.product_id = :productId', {
        productId,
      })
      .andWhere('movement.business_id = :businessId', {
        businessId,
      });

    if (storeId) {
      queryBuilder.andWhere('stock.store_id = :storeId', {
        storeId,
      });
    }

    const movements = await queryBuilder
      .orderBy('movement.created_at', 'DESC')
      .getMany();

    return successResponse(
      'Product stock movement history retrieved successfully',
      movements,
    );
  }
}
