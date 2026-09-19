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

@Injectable()
export class ProductSourcesService {
  constructor(
    @InjectRepository(ProductSource)
    private readonly productSourceRepository: Repository<ProductSource>,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    businessId: string,
    createProductSourceDto: CreateProductSourceDto,
  ): Promise<ApiResponse<ProductSource>> {
    const { product_id, supplier_id } = createProductSourceDto;

    if (!businessId) {
      throw new BadRequestException('Business is required.');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // Validate entities
      const business = await manager.findOne(Business, {
        where: {
          id: businessId,
        },
      });

      if (!business) {
        throw new NotFoundException('Business not found.');
      }

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

      const existing_product_source = await manager.findOne(ProductSource, {
        where: {
          product_id,
          business_id: businessId,
          supplier_id,
        },
      });

      if (existing_product_source) {
        throw new ConflictException('Supplier exist for this product');
      }

      const product_source = manager.create(ProductSource, {
        product_id,
        business_id: businessId,
        supplier_id,
      });

      const saved_product_source = await manager.save(
        ProductSource,
        product_source,
      );

      return successResponse(
        'Supplier and Product link created successfully',
        saved_product_source,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Preserve intentional HTTP errors
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Could not create Product supplier entry.',
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
      productSources: ProductSource[];
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
      .leftJoin('product.business', 'business')
      .where('business.id = :businessId', {
        businessId,
      });

    if (search) {
      queryBuilder.andWhere(
        `
          (
            LOWER(product.name) LIKE LOWER(:search)
            OR LOWER(supplier.name) LIKE LOWER(:search)
          )
          `,
        {
          search: `%${search}%`,
        },
      );
    }

    queryBuilder.orderBy(sortColumn, sortOrder).skip(skip).take(limitNumber);

    const [productSources, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limitNumber);

    return successResponse('Product sources retrieved successfully', {
      productSources,
      meta: {
        totalItems,
        itemCount: productSources.length,
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
      throw new NotFoundException(`Product Source with ID ${id} not found`);
    }

    return successResponse('Product Source retrieved', productSource);
  }

  async update(
    id: string,
    updateProductSourceDto: UpdateProductSourceDto,
  ): Promise<ApiResponse<ProductSource>> {
    const { data: productSource } = await this.findOne(id);

    if (!productSource) {
      throw new NotFoundException(`Product Source with ID ${id} not found`);
    }

    this.productSourceRepository.merge(productSource, updateProductSourceDto);

    const savedProductSource =
      await this.productSourceRepository.save(productSource);

    return successResponse(
      'Product Source updated successfully',
      savedProductSource,
    );
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const { data: productSource } = await this.findOne(id);

    if (!productSource) {
      throw new NotFoundException(`Product Source with ID ${id} not found`);
    }

    await this.productSourceRepository.softRemove(productSource);

    return successResponse('Product Source deleted successfully', null);
  }
}
