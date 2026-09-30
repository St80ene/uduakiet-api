import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Business } from '../business/entities/business.entity';
import { Category, CATEGORY_SORT_FIELDS } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryPaginationQueryDto } from './dto/category_pagination_dto.dto';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';
import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    businessId: string,
  ): Promise<ApiResponse<Category>> {
    const { name, description } = createCategoryDto;

    // Verify that the business exists
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Prevent duplicate category names within the same business
    const existingCategory = await this.categoryRepository.findOne({
      where: {
        business_id: businessId,
        name,
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category "${name}" already exists for this business`,
      );
    }

    const category = this.categoryRepository.create({
      business_id: businessId,
      name,
      description,
      business,
    });

    const savedCategory = await this.categoryRepository.save(category);

    return successResponse('Category created successfully', savedCategory);
  }

  async findAll(
    businessId: string,
    paginationQuery: CategoryPaginationQueryDto,
  ): Promise<
    ApiResponse<{
      categories: Category[];
      meta: PaginationMeta;
    }>
  > {
    const {
      page: pageNumber,
      limit: limitNumber,
      skip,
    } = getPaginationOptions(paginationQuery);

    const { search, order = 'DESC', sortBy = 'created_at' } = paginationQuery;

    const sortColumn = CATEGORY_SORT_FIELDS[sortBy];

    const sortOrder: 'ASC' | 'DESC' =
      order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.business', 'business')
      .leftJoinAndSelect('category.products', 'products')
      .where('category.business_id = :businessId', {
        businessId,
      });

    if (search) {
      queryBuilder.andWhere(
        `
          (
            LOWER(category.name) LIKE LOWER(:search)
            OR LOWER(category.description) LIKE LOWER(:search)
          )
          `,
        {
          search: `%${search}%`,
        },
      );
    }

    queryBuilder.orderBy(sortColumn, sortOrder).skip(skip).take(limitNumber);

    const [categories, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limitNumber);

    return successResponse('Categories retrieved successfully', {
      categories,
      meta: {
        totalItems,
        itemCount: categories.length,
        itemsPerPage: limitNumber,
        totalPages,
        currentPage: pageNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  }

  async findOne(
    id: string,
    businessId: string,
  ): Promise<ApiResponse<Category>> {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
        business_id: businessId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return successResponse('Category retrieved successfully', category);
  }

  async update(
    id: string,
    businessId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ApiResponse<Category>> {
    const { data: category } = await this.findOne(id, businessId);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { name, description } = updateCategoryDto;

    // Only check for duplicate name when name is being changed
    if (name && name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: {
          business_id: businessId,
          name,
        },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          `Category "${name}" already exists for this business`,
        );
      }

      category.name = name;
    }

    if (description !== undefined) {
      category.description = description;
    }

    const savedCategory = await this.categoryRepository.save(category);
    return successResponse('Category updated successfully', savedCategory);
  }

  // async remove(id: string, businessId: string): Promise<ApiResponse<null>> {
  //   const category = await this.findOne(id, businessId);

  //   if (!category?.data) {
  //     throw new NotFoundException('Category not found');
  //   }

  //   await this.categoryRepository.softDelete(id);
  //   return successResponse('Category deleted successfully', null);
  // }
}
