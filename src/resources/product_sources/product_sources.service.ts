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
import { BasePaginationQueryDto } from '../../common/dto/pagination-query.dto';
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
    paginationQuery: BasePaginationQueryDto,
  ): Promise<ApiResponse<{ productSources: ProductSource[]; meta: any }>> {
    const {
      page: pageNumber,
      limit: limitNumber,
      skip,
    } = getPaginationOptions(paginationQuery);

    const findCondition: FindManyOptions = {
      skip: skip,
      take: limitNumber,
      order: { created_at: 'DESC' },
    };

    const [productSources, total] =
      await this.productSourceRepository.findAndCount(findCondition);

    return successResponse('Product sources retrieved successfully', {
      productSources,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
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
