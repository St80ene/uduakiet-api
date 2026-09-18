import { AuditLogsService } from './../audit_logs/audit_logs.service';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';

import { Stock } from '../stocks/entities/stock.entity';
import { Store } from '../stores/entities/store.entity';

import {
  BasePaginationQueryDto,
  PaginationMeta,
  PRODUCT_SORT_FIELDS,
  ProductPaginationQueryDto,
} from '../../common/dto/pagination-query.dto';

import { DashboardCard } from '../dashboard/interfaces/initial_interface';

import {
  AuditLogAction,
  AuditLogEntity,
} from '../../common/enum/audit_log.enum';

import {
  CloudinaryService,
  CloudinaryImage,
} from '../../common/utils/helpers/cloudinary/cloudinary.service';

import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';

import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AuditLog } from '../audit_logs/entities/audit_log.entity';
import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';
import { allowedTransitions, UpdateProductDto } from './dto/update-product.dto';
import { StockMovement } from '../stock_movements/entities/stock_movement.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,

    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,

    private readonly cloudinaryService: CloudinaryService,

    private readonly dataSource: DataSource,

    @Inject(AuditLogsService)
    private readonly auditLogService: AuditLogsService,
  ) {}

  /**
   * Creates a product for the authenticated user's business.
   *
   * Product itself does not contain inventory information.
   *
   * If the authenticated user belongs to a store, a zero-balance
   * Stock row is initialized for that store.
   */
  async create(
    createProductDto: CreateProductDto,
    user: AuthenticatedUser,
    files?: Express.Multer.File[],
  ): Promise<ApiResponse<Product>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const productImages: CloudinaryImage[] = [];

    try {
      if (files?.length) {
        const uploadedResults = await Promise.all(
          files.map((file) =>
            this.cloudinaryService.uploadImage(file, 'products'),
          ),
        );

        productImages.push(...uploadedResults);
      }

      let store: Store | null = null;

      if (user.storeId) {
        store = await queryRunner.manager.findOne(Store, {
          where: {
            id: user.storeId,
            business_id: user.businessId,
          },
        });

        if (!store) {
          throw new BadRequestException(
            'The authenticated user is not assigned to a valid store.',
          );
        }
      }

      const product = queryRunner.manager.create(Product, {
        name: createProductDto.name,
        description: createProductDto.description ?? null,
        selling_price: createProductDto.selling_price,
        cost_price: createProductDto.cost_price,
        images: productImages,
        uom_type: createProductDto.uom_type,
        uom_base_name: createProductDto.uom_base_name,
        uom_display_name: createProductDto.uom_display_name,
        category_id: createProductDto.category_id ?? null,
        business_id: user.businessId,
        default_reorder_point: createProductDto.default_reorder_point ?? 5,
      });

      const savedProduct = await queryRunner.manager.save(Product, product);

      await queryRunner.commitTransaction();

      return successResponse('Product created successfully', savedProduct);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (productImages.length > 0) {
        await Promise.all(
          productImages.map((image) =>
            this.cloudinaryService
              .deleteImage(image.publicId)
              .catch(() => null),
          ),
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error creating product:', error);

      throw new InternalServerErrorException('Failed to create product.');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves products belonging to the authenticated user's business.
   */
  async findAll(
    paginationQuery: ProductPaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<{ products: Product[]; meta: PaginationMeta }>> {
    const {
      page: pageNumber,
      limit: limitNumber,
      skip,
    } = getPaginationOptions(paginationQuery);

    const {
      search,
      status,
      order = 'DESC',
      sortBy = 'updated_at',
    } = paginationQuery;

    const sortColumn =
      PRODUCT_SORT_FIELDS[sortBy] ?? PRODUCT_SORT_FIELDS.updated_at;

    const sortOrder: 'ASC' | 'DESC' =
      order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.deleted_at IS NULL')
      .andWhere('product.business_id = :businessId', {
        businessId: user.businessId,
      });

    if (search) {
      queryBuilder.andWhere(
        `
        (
          LOWER(product.name) LIKE LOWER(:search)
          OR LOWER(product.description) LIKE LOWER(:search)
        )
        `,
        {
          search: `%${search}%`,
        },
      );
    }

    if (status) {
      queryBuilder.andWhere('product.status = :status', {
        status,
      });
    }

    queryBuilder.orderBy(sortColumn, sortOrder).skip(skip).take(limitNumber);

    const [products, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limitNumber);

    return successResponse('Products retrieved successfully', {
      products,
      meta: {
        totalItems,
        itemCount: products.length,
        itemsPerPage: limitNumber,
        totalPages,
        currentPage: pageNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  }

  /**
   * Retrieves a single product belonging to the authenticated user's business.
   *
   * Stock balances are loaded because inventory now belongs to Stock,
   * not Product.
   */
  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<Product>> {
    const product = await this.productRepository.findOne({
      where: {
        id,
        business_id: user.businessId,
        deleted_at: IsNull(),
      },
      relations: {
        stocks: {
          store: true,
        },
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID "${id}" could not be found.`,
      );
    }

    return successResponse('Product retrieved successfully', product);
  }

  /**
   * Updates product catalog information.
   *
   * Inventory quantity and reorder level are intentionally not
   * updated here because they belong to Stock.
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    user: AuthenticatedUser,
    files?: Express.Multer.File[],
  ): Promise<ApiResponse<Product>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, {
        where: {
          id,
          business_id: user.businessId,
          deleted_at: IsNull(),
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID "${id}" could not be found.`,
        );
      }

      const oldProductDetails = structuredClone(product);

      const { imagesToDelete, status, ...productUpdates } = updateProductDto;

      let currentImages = [...(product.images ?? [])];

      if (imagesToDelete?.length) {
        for (const publicId of imagesToDelete) {
          await this.cloudinaryService.deleteImage(publicId);

          currentImages = currentImages.filter(
            (image) => image.publicId !== publicId,
          );
        }
      }

      if (files?.length) {
        const newAssets = await Promise.all(
          files.map((file) =>
            this.cloudinaryService.uploadImage(file, 'products'),
          ),
        );

        currentImages = [...currentImages, ...newAssets];
      }

      product.images = currentImages;

      if (status !== undefined) {
        const oldStatus = product.status;

        if (oldStatus === status) {
          throw new BadRequestException(
            `Product is already ${oldStatus.toLowerCase()}.`,
          );
        }

        if (!allowedTransitions[oldStatus]?.includes(status)) {
          throw new BadRequestException(
            `Product cannot be changed from ${oldStatus} to ${status}.`,
          );
        }

        product.status = status;
      }

      queryRunner.manager.merge(Product, product, productUpdates);

      const updatedProduct = await queryRunner.manager.save(Product, product);

      const newProductDetails = structuredClone(updatedProduct);

      await this.auditLogService.create(
        {
          action: AuditLogAction.UPDATE,
          entity: AuditLogEntity.PRODUCT,
          entityId: updatedProduct.id,
          oldValue: oldProductDetails,
          newValue: newProductDetails,
          metadata: {
            productName: updatedProduct.name,
            businessId: user.businessId,
            updated_at: new Date().toISOString(),
            reason: `${updatedProduct.name} was updated by user`,
          },
        },
        { businessId: user.businessId, storeId: user.storeId },
      );

      await queryRunner.commitTransaction();

      return successResponse('Product updated successfully', updatedProduct);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error(`Error updating product ${id}:`, error);

      throw new InternalServerErrorException(
        'Failed to update product details.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Soft-deletes a product.
   *
   * The product is not physically deleted because inventory history
   * may depend on it.
   */
  async remove(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<null>> {
    try {
      const product = await this.productRepository.findOne({
        where: {
          id,
          business_id: user.businessId,
          deleted_at: IsNull(),
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID "${id}" could not be found.`,
        );
      }

      const oldProductDetails = structuredClone(product);

      if (product.images?.length) {
        await Promise.all(
          product.images.map((image) =>
            this.cloudinaryService
              .deleteImage(image.publicId)
              .catch(() => null),
          ),
        );
      }

      product.images = [];

      await this.productRepository.save(product);

      const deleted = await this.productRepository.softRemove(product);

      await this.auditLogService.create({
        action: AuditLogAction.DELETE,
        entity: AuditLogEntity.PRODUCT,
        entityId: product.id,
        oldValue: oldProductDetails,
        newValue: deleted,
        metadata: {
          productName: product.name,
          businessId: user.businessId,
          deletedAt: new Date().toISOString(),
          reason: 'User initiated deletion',
        },
      });

      return successResponse('Product removed successfully', null);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error(`Error deleting product ${id}:`, error);

      throw new InternalServerErrorException('Failed to remove product.');
    }
  }

  /**
   * Calculates inventory health across the authenticated user's business.
   *
   * Inventory quantities and reorder levels come from Stock.
   */
  async getInventoryHealth(user: AuthenticatedUser): Promise<DashboardCard[]> {
    const productResult = await this.productRepository
      .createQueryBuilder('product')
      .select('COUNT(product.id)', 'totalProducts')
      .where('product.deleted_at IS NULL')
      .andWhere('product.business_id = :businessId', {
        businessId: user.businessId,
      })
      .getRawOne<{
        totalProducts: string;
      }>();

    const stockQuery = this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin('stock.product', 'product')
      .where('stock.business_id = :businessId', {
        businessId: user.businessId,
      })
      .andWhere('product.deleted_at IS NULL');

    if (user.storeId) {
      stockQuery.andWhere('stock.store_id = :storeId', {
        storeId: user.storeId,
      });
    }

    const stockResult = await stockQuery
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
        id: 'products',
        title: 'Products',
        value: Number(productResult?.totalProducts ?? 0),
        severity: 'success',
      },
      {
        id: 'stock',
        title: 'Total Stock',
        value: Number(stockResult?.totalStock ?? 0),
        severity: 'success',
      },
      {
        id: 'low-stock',
        title: 'Low Stock',
        value: Number(stockResult?.lowStock ?? 0),
        severity:
          Number(stockResult?.lowStock ?? 0) > 0 ? 'warning' : 'success',
        subtitle: 'Products below reorder level',
        action: {
          label: 'Create Purchase Requests',
          url: '/purchase-orders/create',
        },
      },
      {
        id: 'out-of-stock',
        title: 'Out of Stock',
        value: Number(stockResult?.outOfStock ?? 0),
        severity:
          Number(stockResult?.outOfStock ?? 0) > 0 ? 'danger' : 'success',
      },
    ];
  }

  /**
   * Retrieves audit history for a product.
   */
  async getProductAuditLogs(
    productId: string,
    user: AuthenticatedUser,
    query: BasePaginationQueryDto,
  ): Promise<
    ApiResponse<{
      auditLogs: AuditLog[];
      meta: PaginationMeta;
    }>
  > {
    const product = await this.productRepository.findOne({
      where: {
        id: productId,
        business_id: user.businessId,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID "${productId}" could not be found.`,
      );
    }

    return this.auditLogService.getEntityAuditLogs(
      AuditLogEntity.PRODUCT,
      productId,
      query,
    );
  }

  /**
   * Retrieves stock movement history for a product.
   */
  async findProductStockHistory(
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
      .where('movement.business_id = :businessId', {
        businessId,
      })
      .andWhere('stock.product_id = :productId', {
        productId,
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

  /**
   * Retrieves current stock for one product.
   *
   * Because stock is store-specific, this returns the balance
   * for the authenticated user's store.
   */
  async findCurrentProductStock(
    productId: string,
    user: AuthenticatedUser,
  ): Promise<ApiResponse<Stock>> {
    const { businessId, storeId } = user;

    if (!storeId) {
      throw new BadRequestException(
        'A store is required to retrieve current stock.',
      );
    }

    const stock = await this.stockRepository.findOne({
      where: {
        product_id: productId,
        business_id: businessId,
        store_id: storeId,
      },
      relations: {
        product: true,
        store: true,
      },
    });

    if (!stock) {
      throw new NotFoundException(
        'Stock balance not found for this product and store.',
      );
    }

    return successResponse('Current stock retrieved successfully', stock);
  }
}
