import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';

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

@Injectable()
export class ProductSourcesService {
  constructor(
    @InjectRepository(ProductSource)
    private readonly productSourceRepository: Repository<ProductSource>,
  ) {}

  async create(
    createProductSourceDto: CreateProductSourceDto,
  ): Promise<ApiResponse<ProductSource>> {
    const { product_id, supplier_id } = createProductSourceDto;

    // Check if this product-supplier link already exists
    const existingSource = await this.productSourceRepository.findOne({
      where: { product_id, supplier_id },
    });

    if (existingSource) {
      throw new ConflictException(
        'Product source relation for this product and supplier already exists',
      );
    }

    const productSource = this.productSourceRepository.create(
      createProductSourceDto,
    );

    const savedSource = await this.productSourceRepository.save(productSource);

    return successResponse('Product Source created successfully', savedSource);
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
      .leftJoinAndSelect('product_source.product', 'product');
    // .leftJoin('product.business', 'business')
    // .where('business.id = :businessId', {
    //   businessId,
    // });

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
