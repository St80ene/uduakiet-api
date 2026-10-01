import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

import {
  PaginationMeta,
  STORE_SORT_FIELDS,
  StorePaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';
import { BusinessesService } from '../business/business.service';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,

    @Inject(BusinessesService)
    private readonly businessesService: BusinessesService,
  ) {}

  async create(
    createStoreDto: CreateStoreDto,
    businessId: string,
  ): Promise<ApiResponse<Store>> {
    const { name, code, address, city, state, country, phone_number } =
      createStoreDto;

    // Verify that the business exists
    const { data: business } = await this.businessesService.findOne(businessId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const existingStore = await this.storeRepository
      .createQueryBuilder('store')
      .where('store.business_id = :businessId', { businessId })
      .andWhere('(store.name = :name OR store.code = :code)', {
        name,
        code,
      })
      .getOne();

    if (existingStore) {
      if (existingStore.name === name) {
        throw new ConflictException(
          `Store "${name}" already exists for this business`,
        );
      }

      if (existingStore.code === code) {
        throw new ConflictException(
          `Store code "${code}" already exists for this business`,
        );
      }
    }

    const store = this.storeRepository.create({
      business_id: businessId,
      business,
      name,
      code,
      address,
      city,
      state,
      country,
      phone_number,
    });

    const savedStore = await this.storeRepository.save(store);

    return successResponse('Store created successfully', savedStore);
  }

  async findAll(
    businessId: string,
    paginationQuery: StorePaginationQueryDto,
  ): Promise<
    ApiResponse<{
      stores: Store[];
      meta: PaginationMeta;
    }>
  > {
    const {
      page: pageNumber,
      limit: limitNumber,
      skip,
    } = getPaginationOptions(paginationQuery);

    const { search, order = 'DESC', sortBy = 'created_at' } = paginationQuery;

    const sortColumn =
      STORE_SORT_FIELDS[sortBy] ?? STORE_SORT_FIELDS.created_at;

    const sortOrder: 'ASC' | 'DESC' =
      order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.business', 'business')
      .where('store.business_id = :businessId', {
        businessId,
      });

    if (search) {
      queryBuilder.andWhere(
        `
          (
            LOWER(store.name) LIKE LOWER(:search)
            OR LOWER(store.code) LIKE LOWER(:search)
            OR LOWER(store.city) LIKE LOWER(:search)
            OR LOWER(store.state) LIKE LOWER(:search)
          )
        `,
        {
          search: `%${search}%`,
        },
      );
    }

    queryBuilder.orderBy(sortColumn, sortOrder).skip(skip).take(limitNumber);

    const [stores, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limitNumber);

    return successResponse('Stores retrieved successfully', {
      stores,
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

  async findOne(id: string, businessId: string): Promise<ApiResponse<Store>> {
    const store = await this.storeRepository.findOne({
      where: {
        id,
        business_id: businessId,
      },
      relations: {
        business: true,
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return successResponse('Store retrieved successfully', store);
  }

  async update(
    id: string,
    businessId: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<ApiResponse<Store>> {
    const { data: store } = await this.findOne(id, businessId);

    if (!store) throw new NotFoundException('Store not found');

    const { name, code, address, city, state, country, phone_number } =
      updateStoreDto;

    // Only check for duplicate name when the name is being changed
    if (name !== undefined && name !== store.name) {
      const existingName = await this.storeRepository.findOne({
        where: {
          business_id: businessId,
          name,
        },
      });

      if (existingName && existingName.id !== id) {
        throw new ConflictException(
          `Store "${name}" already exists for this business`,
        );
      }

      store.name = name;
    }

    // Only check for duplicate code when the code is being changed
    if (code !== undefined && code !== store.code) {
      const existingCode = await this.storeRepository.findOne({
        where: {
          business_id: businessId,
          code,
        },
      });

      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(
          `Store code "${code}" already exists for this business`,
        );
      }

      store.code = code;
    }

    if (address !== undefined) {
      store.address = address;
    }

    if (city !== undefined) {
      store.city = city;
    }

    if (state !== undefined) {
      store.state = state;
    }

    if (country !== undefined) {
      store.country = country;
    }

    if (phone_number !== undefined) {
      store.phone_number = phone_number;
    }

    const savedStore = await this.storeRepository.save(store);

    return successResponse('Store updated successfully', savedStore);
  }

  async remove(id: string, businessId: string): Promise<ApiResponse<null>> {
    // findOne scopes the store to the authenticated user's business
    await this.findOne(id, businessId);

    await this.storeRepository.softDelete({
      id,
      business_id: businessId,
    });

    return successResponse('Store deleted successfully', null);
  }
}
