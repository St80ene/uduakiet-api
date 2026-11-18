import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ProductSource } from './entities/product_source.entity';
import { CreateProductSourceDto } from './dto/create-product_source.dto';
import { UpdateProductSourceDto } from './dto/update-product_source.dto';

import {
  PaginationMeta,
  PRODUCT_SOURCE_SORT_FIELDS,
  ProductSourcePaginationQueryDto,
} from '../../common/dto/pagination-query.dto';

import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';

import { Business } from '../business/entities/business.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from '../products/entities/product.entity';
import { MoneyUtil } from '../../common/utils/money.utils';

@Injectable()
export class ProductSourcesService {
  constructor(
    @InjectRepository(ProductSource)
    private readonly productSourceRepository: Repository<ProductSource>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Converts a major-unit monetary amount received from the API
   * into minor units for database storage.
   */
  private convertCostPriceToMinorUnits(
    amount: string,
    currency: string,
  ): string {
    try {
      const minorAmount = MoneyUtil.toMinorUnits(amount, currency);

      if (minorAmount < 0n) {
        throw new BadRequestException('Cost price cannot be negative.');
      }

      return minorAmount.toString();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Invalid cost price or business currency.',
      );
    }
  }

  async create(
    businessId: string,
    createProductSourceDto: CreateProductSourceDto,
  ): Promise<ApiResponse<ProductSource>> {
    const {
      product_id,
      supplier_id,
      supplier_sku,
      estimated_lead_time_days,
      cost_price,
      is_primary,
    } = createProductSourceDto;

    if (!businessId) {
      throw new BadRequestException('Business is required.');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // 1. Validate business and resolve its currency.
      const business = await manager.findOne(Business, {
        where: { id: businessId },
      });

      if (!business) {
        throw new NotFoundException('Business not found.');
      }

      if (typeof cost_price !== 'string' || !cost_price.trim()) {
        throw new BadRequestException('A valid cost price is required.');
      }

      const costPriceMinor = this.convertCostPriceToMinorUnits(
        cost_price,
        business.currency,
      );

      // 2. Validate supplier.
      const supplier = await manager.findOne(Supplier, {
        where: {
          id: supplier_id,
          business_id: businessId,
        },
      });

      if (!supplier) {
        throw new NotFoundException(
          'Supplier not found or does not belong to this business.',
        );
      }

      // 3. Validate product.
      const product = await manager.findOne(Product, {
        where: {
          id: product_id,
          business_id: businessId,
        },
      });

      if (!product) {
        throw new NotFoundException(
          'Product not found or does not belong to this business.',
        );
      }

      // 4. Prevent duplicate product-supplier relationships.
      const existingProductSource = await manager.findOne(ProductSource, {
        where: {
          product_id,
          business_id: businessId,
          supplier_id,
        },
      });

      if (existingProductSource) {
        throw new ConflictException(
          'This supplier is already linked to this product.',
        );
      }

      // 5. A product should have only one primary supplier.
      if (is_primary) {
        await manager.update(
          ProductSource,
          {
            product_id,
            business_id: businessId,
            is_primary: true,
          },
          {
            is_primary: false,
          },
        );
      }

      // 6. Create product source.
      const productSource = manager.create(ProductSource, {
        product_id,
        business_id: businessId,
        supplier_id,
        supplier_sku,
        estimated_lead_time_days,
        cost_price: costPriceMinor,
        is_primary,
      });

      const savedProductSource = await manager.save(
        ProductSource,
        productSource,
      );

      await queryRunner.commitTransaction();

      return successResponse(
        'Supplier and Product link created successfully.',
        savedProductSource,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Could not create product supplier entry.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    businessId: string,
    paginationQuery: ProductSourcePaginationQueryDto,
  ): Promise<
    ApiResponse<{
      product_sources: ProductSource[];
      meta: PaginationMeta;
    }>
  > {
    const {
      page: pageNumber,
      limit: limitNumber,
      skip,
    } = getPaginationOptions(paginationQuery);

    const { search, order = 'DESC', sortBy = 'created_at' } = paginationQuery;

    const sortColumn = PRODUCT_SOURCE_SORT_FIELDS[sortBy];

    const sortOrder: 'ASC' | 'DESC' =
      order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.productSourceRepository
      .createQueryBuilder('product_source')
      .leftJoinAndSelect('product_source.supplier', 'supplier')
      .leftJoinAndSelect('product_source.product', 'product')
      .where('product_source.business_id = :businessId', {
        businessId,
      });

    if (search) {
      const parsedSearchNumber = parseInt(search, 10);
      const isNumber = !isNaN(parsedSearchNumber);

      if (isNumber) {
        queryBuilder.andWhere(
          `
          (
            LOWER(product.name) LIKE LOWER(:searchStr)
            OR LOWER(supplier.name) LIKE LOWER(:searchStr)
            OR LOWER(product_source.supplier_sku) LIKE LOWER(:searchStr)
            OR product_source.estimated_lead_time_days = :searchNum
          )
          `,
          {
            searchStr: `%${search}%`,
            searchNum: parsedSearchNumber,
          },
        );
      } else {
        queryBuilder.andWhere(
          `
          (
            LOWER(product.name) LIKE LOWER(:searchStr)
            OR LOWER(supplier.name) LIKE LOWER(:searchStr)
            OR LOWER(product_source.supplier_sku) LIKE LOWER(:searchStr)
          )
          `,
          {
            searchStr: `%${search}%`,
          },
        );
      }
    }

    queryBuilder.orderBy(sortColumn, sortOrder).skip(skip).take(limitNumber);

    const [productSources, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limitNumber);

    return successResponse('Product sources retrieved successfully', {
      product_sources: productSources,
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

  async findOne(id: string): Promise<ApiResponse<ProductSource>> {
    const productSource = await this.productSourceRepository.findOne({
      where: { id },
    });

    if (!productSource) {
      throw new NotFoundException(`Product Source with ID ${id} not found.`);
    }

    return successResponse('Product Source retrieved.', productSource);
  }

  async update(
    id: string,
    updateProductSourceDto: UpdateProductSourceDto,
  ): Promise<ApiResponse<ProductSource>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // 1. Retrieve the existing product source.
      const productSource = await manager.findOne(ProductSource, {
        where: { id },
      });

      if (!productSource) {
        throw new NotFoundException(`Product Source with ID ${id} not found.`);
      }

      // 2. Resolve the business currency.
      const business = await manager.findOne(Business, {
        where: {
          id: productSource.business_id,
        },
      });

      if (!business) {
        throw new NotFoundException('Business not found.');
      }

      const { cost_price, is_primary, supplier_id, ...otherUpdates } =
        updateProductSourceDto;

      // 3. Validate a replacement supplier if supplied.
      if (supplier_id) {
        const supplier = await manager.findOne(Supplier, {
          where: {
            id: supplier_id,
            business_id: productSource.business_id,
          },
        });

        if (!supplier) {
          throw new NotFoundException(
            'Supplier not found or does not belong to this business.',
          );
        }
      }

      // 4. Convert cost price only when a new value is supplied.
      if (cost_price !== undefined) {
        if (typeof cost_price !== 'string' || !cost_price.trim()) {
          throw new BadRequestException('A valid cost price is required.');
        }

        productSource.cost_price = this.convertCostPriceToMinorUnits(
          cost_price,
          business.currency,
        );
      }

      // 5. Maintain one primary supplier per product.
      if (is_primary === true) {
        await manager.update(
          ProductSource,
          {
            product_id: productSource.product_id,
            business_id: productSource.business_id,
            is_primary: true,
          },
          {
            is_primary: false,
          },
        );
      }

      // 6. Apply the remaining updates.
      manager.merge(ProductSource, productSource, otherUpdates);

      if (is_primary !== undefined) {
        productSource.is_primary = is_primary;
      }

      if (supplier_id !== undefined) {
        productSource.supplier_id = supplier_id;
      }

      const savedProductSource = await manager.save(
        ProductSource,
        productSource,
      );

      await queryRunner.commitTransaction();

      return successResponse(
        'Product Source updated successfully.',
        savedProductSource,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Could not update product supplier entry.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const { data: productSource } = await this.findOne(id);

    if (!productSource) {
      throw new NotFoundException(`Product Source with ID ${id} not found.`);
    }

    await this.productSourceRepository.softRemove(productSource);

    return successResponse('Product Source deleted successfully.', null);
  }
}
