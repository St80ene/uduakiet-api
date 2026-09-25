import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  StockMovement,
  StockMovementDirection,
} from './entities/stock_movement.entity';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';
import { CreateStockMovementDto } from './dto/create-stock_movement.dto';
import { Stock } from '../stocks/entities/stock.entity';
import { Store } from '../stores/entities/store.entity';
import { Product } from '../products/entities/product.entity';

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
  async createMovement(
    user: AuthenticatedUser,
    dto: CreateStockMovementDto,
  ): Promise<ApiResponse<StockMovement>> {
    const { quantity, direction } = dto;
    if (quantity <= 0) {
      throw new BadRequestException(
        'Movement quantity must be greater than zero.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      /**
       * ------------------------------------------------------------
       * PRODUCT
       * ------------------------------------------------------------
       */

      const { businessId, storeId } = user;

      const product = await queryRunner.manager.findOne(Product, {
        where: {
          id: dto.product_id,
          business_id: businessId,
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID "${dto.product_id}" could not be found.`,
        );
      }

      /**
       * ------------------------------------------------------------
       * STORE
       * ------------------------------------------------------------
       */

      if (!storeId) {
        throw new BadRequestException(
          'The authenticated user is not assigned to a store.',
        );
      }

      const store = await queryRunner.manager.findOne(Store, {
        where: {
          id: storeId,
          business_id: businessId,
        },
      });

      if (!store) {
        throw new NotFoundException(
          'The authenticated store could not be found.',
        );
      }

      /**
       * ------------------------------------------------------------
       * STOCK
       * ------------------------------------------------------------
       *
       * Lock the existing stock row so concurrent requests cannot
       * both read the same quantity and overwrite each other.
       */

      let stock = await queryRunner.manager
        .createQueryBuilder(Stock, 'stock')
        .setLock('pessimistic_write')
        .where('stock.product_id = :productId', {
          productId: product.id,
        })
        .andWhere('stock.store_id = :storeId', {
          storeId: store.id,
        })
        .andWhere('stock.business_id = :businessId', {
          businessId,
        })
        .getOne();

      /**
       * A stock balance can be created lazily if the product
       * has never had inventory in this store.
       */
      if (!stock) {
        stock = queryRunner.manager.create(Stock, {
          product_id: product.id,
          business_id: businessId,
          store_id: store.id,
          current_quantity: 0,
        });

        await queryRunner.manager.save(Stock, stock);

        /**
         * Reload the row with a write lock after creation.
         */
        stock = await queryRunner.manager
          .createQueryBuilder(Stock, 'stock')
          .setLock('pessimistic_write')
          .where('stock.id = :stockId', {
            stockId: stock.id,
          })
          .getOneOrFail();
      }

      /**
       * ------------------------------------------------------------
       * CALCULATE NEW BALANCE
       * ------------------------------------------------------------
       */

      const quantity_before = quantity;

      let quantity_after: number;

      if (direction === StockMovementDirection.IN) {
        quantity_after = quantity_before + quantity;
      } else {
        if (quantity_before < quantity) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${quantity_before}, requested: ${dto.quantity}.`,
          );
        }

        quantity_after = quantity_before - quantity;
      }

      /**
       * ------------------------------------------------------------
       * UPDATE CURRENT BALANCE
       * ------------------------------------------------------------
       */

      stock.current_quantity = quantity_after;

      await queryRunner.manager.save(Stock, stock);

      /**
       * ------------------------------------------------------------
       * CREATE IMMUTABLE LEDGER ENTRY
       * ------------------------------------------------------------
       */

      const movement = queryRunner.manager.create(StockMovement, {
        stock_id: stock.id,
        business_id: user.businessId,
        created_by_id: user.id,
        type: dto.type,
        direction: dto.direction,
        quantity: dto.quantity,
        quantity_before,
        quantity_after,
        unit_cost_price: dto.unit_cost_price ?? product.cost_price,
        unit_selling_price: dto.unit_selling_price ?? product.selling_price,
      });

      const savedMovement = await queryRunner.manager.save(
        StockMovement,
        movement,
      );

      await queryRunner.commitTransaction();

      return successResponse(
        'Stock movement created successfully',
        savedMovement,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error creating stock movement:', error);

      throw new InternalServerErrorException(
        'Transaction failed while processing stock movement.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Creates multiple stock movements atomically.
   */
  async bulkCreateMovements(
    user: AuthenticatedUser,
    dtoArray: CreateStockMovementDto[],
  ): Promise<ApiResponse<StockMovement[]>> {
    const { businessId, storeId } = user;
    if (!dtoArray.length) {
      throw new BadRequestException('At least one stock movement is required.');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const movements: StockMovement[] = [];

      if (!storeId) {
        throw new BadRequestException(
          'The authenticated user is not assigned to a store.',
        );
      }

      const store = await queryRunner.manager.findOne(Store, {
        where: {
          id: storeId,
          business_id: businessId,
        },
      });

      if (!store) {
        throw new NotFoundException(
          'The authenticated store could not be found.',
        );
      }

      for (const dto of dtoArray) {
        if (dto.quantity <= 0) {
          throw new BadRequestException(
            'Movement quantity must be greater than zero.',
          );
        }

        const product = await queryRunner.manager.findOne(Product, {
          where: {
            id: dto.product_id,
            business_id: businessId,
          },
        });

        if (!product) {
          throw new NotFoundException(
            `Product "${dto.product_id}" could not be found.`,
          );
        }

        let stock = await queryRunner.manager
          .createQueryBuilder(Stock, 'stock')
          .setLock('pessimistic_write')
          .where('stock.product_id = :productId', {
            productId: product.id,
          })
          .andWhere('stock.store_id = :storeId', {
            storeId: store.id,
          })
          .andWhere('stock.business_id = :businessId', {
            businessId: user.businessId,
          })
          .getOne();

        if (!stock) {
          stock = queryRunner.manager.create(Stock, {
            product_id: product.id,
            business_id: user.businessId,
            store_id: store.id,
            quantity: 0,
            reorder_level: 5,
          });

          await queryRunner.manager.save(Stock, stock);
        }

        const quantityBefore = stock.current_quantity;

        let quantityAfter: number;

        if (dto.direction === StockMovementDirection.IN) {
          quantityAfter = quantityBefore + dto.quantity;
        } else {
          if (quantityBefore < dto.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.name}". Available: ${quantityBefore}, requested: ${dto.quantity}.`,
            );
          }

          quantityAfter = quantityBefore - dto.quantity;
        }

        stock.current_quantity = quantityAfter;

        await queryRunner.manager.save(Stock, stock);

        const movement = queryRunner.manager.create(StockMovement, {
          stock_id: stock.id,
          business_id: user.businessId,
          created_by_id: user.id,
          type: dto.type,
          direction: dto.direction,
          quantity: dto.quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          unit_cost_price: dto.unit_cost_price ?? product.cost_price,
          unit_selling_price: dto.unit_selling_price ?? product.selling_price,
        });

        const savedMovement = await queryRunner.manager.save(
          StockMovement,
          movement,
        );

        movements.push(savedMovement);
      }

      await queryRunner.commitTransaction();

      return successResponse('Stock movements created successfully', movements);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error creating stock movements:', error);

      throw new InternalServerErrorException(
        'Transaction failed while processing stock movements.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves all stock movements belonging to the
   * authenticated user's business.
   *
   * Optionally restricted to the user's current store.
   */
  async findAll(
    user: AuthenticatedUser,
  ): Promise<ApiResponse<StockMovement[]>> {
    const { businessId, storeId } = user;

    const queryBuilder = this.stockMovementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.stock', 'stock')
      .leftJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('stock.store', 'store')
      .leftJoinAndSelect('movement.created_by', 'createdBy')
      .where('movement.business_id = :businessId', {
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

    return successResponse('Stock movements retrieved successfully', movements);
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
