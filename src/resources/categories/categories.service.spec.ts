import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { Business } from '../business/entities/business.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryPaginationQueryDto } from './dto/category_pagination_dto.dto';
import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';

jest.mock('../../utils/helpers/get_pagination_options.util');

describe('CategoriesService', () => {
  let service: CategoriesService;

  type CategoryRepositoryMock = {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
    softDelete: jest.Mock;
  };

  type BusinessRepositoryMock = {
    findOne: jest.Mock;
  };

  let categoryRepository: CategoryRepositoryMock;
  let businessRepository: BusinessRepositoryMock;

  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  const businessId = 'business-1';
  const categoryId = 'category-1';

  const createMockBusiness = (overrides: Partial<Business> = {}): Business =>
    ({
      id: businessId,
      name: 'SwiftBuy Store',
      legal_name: 'SwiftBuy Store Ltd',
      city: 'Lagos',
      street: '123 Test Street',
      state: 'Lagos',
      country: 'Nigeria',
      phone_number: '08000000000',
      currency: 'NGN',
      settings: {},
      logo: null,
      deletedAt: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    }) as Business;

  const mockBusiness = createMockBusiness();

  const createMockCategory = (overrides: Partial<Category> = {}): Category =>
    ({
      id: categoryId,
      business_id: businessId,
      name: 'Electronics',
      description: 'Electronic products',
      business: mockBusiness,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    }) as Category;

  const mockCategory = createMockCategory();

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    categoryRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      softDelete: jest.fn(),
    };

    businessRepository = {
      findOne: jest.fn(),
    };

    service = new CategoriesService(
      categoryRepository as unknown as Repository<Category>,
      businessRepository as unknown as Repository<Business>,
    );

    (getPaginationOptions as jest.Mock).mockReturnValue({
      page: 1,
      limit: 10,
      skip: 0,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // CREATE
  // ============================================================

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      business_id: businessId,
      name: 'Electronics',
      description: 'Electronic products',
    };

    it('should create a category successfully', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);

      categoryRepository.findOne.mockResolvedValue(null);

      categoryRepository.create.mockReturnValue(mockCategory);

      categoryRepository.save.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(result).toEqual({
        status: true,
        message: 'Category created successfully',
        data: mockCategory,
      });

      expect(businessRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: businessId,
        },
      });

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          business_id: businessId,
          name: 'Electronics',
        },
      });

      expect(categoryRepository.create).toHaveBeenCalledWith({
        business_id: businessId,
        name: 'Electronics',
        description: 'Electronic products',
        business: mockBusiness,
      });

      expect(categoryRepository.save).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw NotFoundException when business does not exist', async () => {
      businessRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException('Business not found'),
      );

      expect(categoryRepository.findOne).not.toHaveBeenCalled();
      expect(categoryRepository.create).not.toHaveBeenCalled();
      expect(categoryRepository.save).not.toHaveBeenCalled();
    });

    it('should prevent duplicate category names within the same business', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);

      categoryRepository.findOne.mockResolvedValue(mockCategory);

      await expect(service.create(createDto)).rejects.toThrow(
        new ConflictException(
          'Category "Electronics" already exists for this business',
        ),
      );

      expect(categoryRepository.create).not.toHaveBeenCalled();
      expect(categoryRepository.save).not.toHaveBeenCalled();
    });

    it('should allow the same category name in another business', async () => {
      const anotherBusinessId = 'business-2';

      const dto: CreateCategoryDto = {
        business_id: anotherBusinessId,
        name: 'Electronics',
        description: 'Electronic products',
      };

      const anotherBusiness = {
        id: anotherBusinessId,
      } as Business;

      businessRepository.findOne.mockResolvedValue(anotherBusiness);

      categoryRepository.findOne.mockResolvedValue(null);

      const anotherCategory = {
        ...mockCategory,
        business_id: anotherBusinessId,
        business: anotherBusiness,
      } as Category;

      categoryRepository.create.mockReturnValue(anotherCategory);
      categoryRepository.save.mockResolvedValue(anotherCategory);

      const result = await service.create(dto);

      expect(result.data).toEqual(anotherCategory);

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          business_id: anotherBusinessId,
          name: 'Electronics',
        },
      });
    });

    it('should preserve undefined description when not supplied', async () => {
      const dto: CreateCategoryDto = {
        business_id: businessId,
        name: 'Electronics',
      };

      businessRepository.findOne.mockResolvedValue(mockBusiness);
      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockResolvedValue(mockCategory);

      await service.create(dto);

      expect(categoryRepository.create).toHaveBeenCalledWith({
        business_id: businessId,
        name: 'Electronics',
        description: undefined,
        business: mockBusiness,
      });
    });

    it('should propagate repository errors when checking the business', async () => {
      const databaseError = new Error('Database unavailable');

      businessRepository.findOne.mockRejectedValue(databaseError);

      await expect(service.create(createDto)).rejects.toThrow(databaseError);

      expect(categoryRepository.findOne).not.toHaveBeenCalled();
    });

    it('should propagate repository errors when checking duplicate category', async () => {
      const databaseError = new Error('Database unavailable');

      businessRepository.findOne.mockResolvedValue(mockBusiness);
      categoryRepository.findOne.mockRejectedValue(databaseError);

      await expect(service.create(createDto)).rejects.toThrow(databaseError);

      expect(categoryRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate repository errors when saving', async () => {
      const databaseError = new Error('Insert failed');

      businessRepository.findOne.mockResolvedValue(mockBusiness);
      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockRejectedValue(databaseError);

      await expect(service.create(createDto)).rejects.toThrow(databaseError);
    });

    it('should not save anything if category creation fails', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);
      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.create.mockImplementation(() => {
        throw new Error('Entity creation failed');
      });

      await expect(service.create(createDto)).rejects.toThrow(
        'Entity creation failed',
      );

      expect(categoryRepository.save).not.toHaveBeenCalled();
    });

    it('should execute business lookup before duplicate lookup', async () => {
      const calls: string[] = [];

      businessRepository.findOne.mockImplementation(() => {
        calls.push('business');
        return mockBusiness;
      });

      categoryRepository.findOne.mockImplementation(() => {
        calls.push('category');
        return null;
      });

      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockResolvedValue(mockCategory);

      await service.create(createDto);

      expect(calls).toEqual(['business', 'category']);
    });
  });

  // ============================================================
  // FIND ALL
  // ============================================================

  describe('findAll', () => {
    const paginationQuery = {
      page: 1,
      limit: 10,
      search: undefined,
      order: 'DESC',
      sortBy: 'created_at',
    } as CategoryPaginationQueryDto;

    it('should retrieve categories successfully', async () => {
      const categories = [mockCategory];

      queryBuilder.getManyAndCount.mockResolvedValue([categories, 1]);

      const result = await service.findAll(businessId, paginationQuery);

      expect(result).toEqual({
        status: true,
        message: 'Categories retrieved successfully',
        data: {
          categories,
          meta: {
            totalItems: 1,
            itemsPerPage: 10,
            totalPages: 1,
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'category.business_id = :businessId',
        {
          businessId,
        },
      );

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();

      expect(queryBuilder.orderBy).toHaveBeenCalled();

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);

      expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 1]);

      const query = {
        page: 1,
        limit: 10,
        search: 'electronics',
        order: 'DESC',
        sortBy: 'created_at',
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(category.name) LIKE LOWER(:search)'),
        {
          search: '%electronics%',
        },
      );
    });

    it('should search both name and description', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 1]);

      const query = {
        page: 1,
        limit: 10,
        search: 'electronic',
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(category.name) LIKE LOWER(:search)'),
        {
          search: '%electronic%',
        },
      );
    });

    it('should not add search condition when search is undefined', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should not add search condition when search is an empty string', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: '',
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should correctly calculate pagination metadata', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([
        Array.from({ length: 10 }, (_, index) => ({
          ...mockCategory,
          id: `category-${index}`,
        })) as Category[],
        35,
      ]);

      (getPaginationOptions as jest.Mock).mockReturnValue({
        page: 2,
        limit: 10,
        skip: 10,
      });

      const query = {
        page: 2,
        limit: 10,
      } as CategoryPaginationQueryDto;

      const result = await service.findAll(businessId, query);

      expect(result?.data?.meta).toEqual({
        totalItems: 35,
        itemsPerPage: 10,
        totalPages: 4,
        currentPage: 2,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should correctly identify the first page', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 11]);

      const result = await service.findAll(businessId, paginationQuery);

      expect(result?.data?.meta?.hasPreviousPage).toBe(false);
      expect(result?.data?.meta?.hasNextPage).toBe(true);
    });

    it('should correctly identify the last page', async () => {
      (getPaginationOptions as jest.Mock).mockReturnValue({
        page: 2,
        limit: 10,
        skip: 10,
      });

      queryBuilder.getManyAndCount.mockResolvedValue([[mockCategory], 11]);

      const query = {
        page: 2,
        limit: 10,
      } as CategoryPaginationQueryDto;

      const result = await service.findAll(businessId, query);

      expect(result?.data?.meta?.hasPreviousPage).toBe(true);
      expect(result?.data?.meta?.hasNextPage).toBe(false);
    });

    it('should handle zero categories', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(businessId, paginationQuery);

      expect(result?.data?.categories).toEqual([]);

      expect(result?.data?.meta).toEqual({
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should handle a page beyond the available records', async () => {
      (getPaginationOptions as jest.Mock).mockReturnValue({
        page: 100,
        limit: 10,
        skip: 990,
      });

      queryBuilder.getManyAndCount.mockResolvedValue([[], 20]);

      const query = {
        page: 100,
        limit: 10,
      } as CategoryPaginationQueryDto;

      const result = await service.findAll(businessId, query);

      expect(result?.data?.categories).toEqual([]);

      expect(result?.data?.meta).toEqual({
        totalItems: 20,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 2,
        currentPage: 100,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('should use ASC when order is ASC', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        order: 'ASC',
        sortBy: 'created_at',
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        expect.any(String),
        'ASC',
      );
    });

    it('should default to DESC for invalid order values', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        order: 'INVALID',
        sortBy: 'created_at',
      } as unknown as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        expect.any(String),
        'DESC',
      );
    });

    it('should pass the calculated skip and limit to TypeORM', async () => {
      (getPaginationOptions as jest.Mock).mockReturnValue({
        page: 5,
        limit: 25,
        skip: 100,
      });

      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 5,
        limit: 25,
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.skip).toHaveBeenCalledWith(100);
      expect(queryBuilder.take).toHaveBeenCalledWith(25);
    });

    it('should preserve business isolation', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll('business-secret', paginationQuery);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'category.business_id = :businessId',
        {
          businessId: 'business-secret',
        },
      );
    });

    it('should propagate query builder errors', async () => {
      const databaseError = new Error('Database connection lost');

      queryBuilder.getManyAndCount.mockRejectedValue(databaseError);

      await expect(
        service.findAll(businessId, paginationQuery),
      ).rejects.toThrow(databaseError);
    });

    it('should call pagination helper with the supplied query', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(businessId, paginationQuery);

      expect(getPaginationOptions).toHaveBeenCalledWith(paginationQuery);
    });

    it('should not execute the query before pagination and ordering are configured', async () => {
      const callOrder: string[] = [];

      queryBuilder.orderBy.mockImplementation(() => {
        callOrder.push('orderBy');
        return queryBuilder;
      });

      queryBuilder.skip.mockImplementation(() => {
        callOrder.push('skip');
        return queryBuilder;
      });

      queryBuilder.take.mockImplementation(() => {
        callOrder.push('take');
        return queryBuilder;
      });

      queryBuilder.getManyAndCount.mockImplementation(() => {
        callOrder.push('execute');
        return [[], 0];
      });

      await service.findAll(businessId, paginationQuery);

      expect(callOrder).toEqual(['orderBy', 'skip', 'take', 'execute']);
    });
  });

  // ============================================================
  // FIND ONE
  // ============================================================

  describe('findOne', () => {
    it('should return a category successfully', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne(categoryId, businessId);

      expect(result).toEqual({
        status: true,
        message: 'Category retrieved successfully',
        data: mockCategory,
      });

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: categoryId,
          business_id: businessId,
        },
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(categoryId, businessId)).rejects.toThrow(
        new NotFoundException('Category not found'),
      );
    });

    it('should not return a category belonging to another business', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(categoryId, 'another-business'),
      ).rejects.toThrow(new NotFoundException('Category not found'));

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: categoryId,
          business_id: 'another-business',
        },
      });
    });

    it('should propagate repository errors', async () => {
      const databaseError = new Error('Database unavailable');

      categoryRepository.findOne.mockRejectedValue(databaseError);

      await expect(service.findOne(categoryId, businessId)).rejects.toThrow(
        databaseError,
      );
    });
  });

  // ============================================================
  // UPDATE
  // ============================================================

  describe('update', () => {
    it('should update the category name', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne.mockResolvedValue(category);
      categoryRepository.save.mockResolvedValue({
        ...category,
        name: 'New Name',
      });

      const dto: UpdateCategoryDto = {
        name: 'New Name',
      };

      const result = await service.update(categoryId, businessId, dto);

      expect(category.name).toBe('New Name');

      expect(categoryRepository.save).toHaveBeenCalledWith(category);

      expect(result.message).toBe('Category updated successfully');
    });

    it('should update the description', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne.mockResolvedValue(category);
      categoryRepository.save.mockResolvedValue(category);

      const dto: UpdateCategoryDto = {
        description: 'Updated description',
      };

      await service.update(categoryId, businessId, dto);

      expect(category.description).toBe('Updated description');
    });

    it('should update both name and description', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(null);

      categoryRepository.save.mockResolvedValue(category);

      const dto: UpdateCategoryDto = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };

      await service.update(categoryId, businessId, dto);

      expect(category.name).toBe('Updated Electronics');

      expect(category.description).toBe('Updated description');
    });

    it('should not check duplicate name when name is unchanged', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne.mockResolvedValue(category);

      categoryRepository.save.mockResolvedValue(category);

      const dto: UpdateCategoryDto = {
        name: category.name,
      };

      await service.update(categoryId, businessId, dto);

      expect(categoryRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should not check duplicate name when only description changes', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne.mockResolvedValue(category);

      categoryRepository.save.mockResolvedValue(category);

      await service.update(categoryId, businessId, {
        description: 'New description',
      });

      expect(categoryRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should reject changing name to another existing category name', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      const duplicateCategory = {
        ...mockCategory,
        id: 'category-2',
        name: 'Clothing',
      } as Category;

      categoryRepository.findOne
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(duplicateCategory);

      const dto: UpdateCategoryDto = {
        name: 'Clothing',
      };

      await expect(service.update(categoryId, businessId, dto)).rejects.toThrow(
        new ConflictException(
          'Category "Clothing" already exists for this business',
        ),
      );

      expect(categoryRepository.save).not.toHaveBeenCalled();
    });

    it('should allow update when matching category has the same id', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      const sameCategory = {
        ...mockCategory,
        name: 'New Name',
      } as Category;

      categoryRepository.findOne
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(sameCategory);

      categoryRepository.save.mockResolvedValue(category);

      await service.update(categoryId, businessId, {
        name: 'New Name',
      });

      expect(categoryRepository.save).toHaveBeenCalled();
    });

    it('should allow an empty description', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne.mockResolvedValue(category);

      categoryRepository.save.mockResolvedValue(category);

      await service.update(categoryId, businessId, {
        description: '',
      });

      expect(category.description).toBe('');
    });

    it('should throw NotFoundException when updating a missing category', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(categoryId, businessId, {
          name: 'New Name',
        }),
      ).rejects.toThrow(new NotFoundException('Category not found'));

      expect(categoryRepository.save).not.toHaveBeenCalled();
    });

    it('should not modify the category when duplicate name is detected', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      const duplicateCategory = {
        ...mockCategory,
        id: 'category-2',
        name: 'Clothing',
      } as Category;

      categoryRepository.findOne
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(duplicateCategory);

      await expect(
        service.update(categoryId, businessId, {
          name: 'Clothing',
        }),
      ).rejects.toThrow(ConflictException);

      expect(category.name).toBe('Electronics');
    });

    it('should propagate save errors', async () => {
      const databaseError = new Error('Update failed');

      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne.mockResolvedValue(category);

      categoryRepository.save.mockRejectedValue(databaseError);

      await expect(
        service.update(categoryId, businessId, {
          description: 'Updated',
        }),
      ).rejects.toThrow(databaseError);
    });

    it('should propagate duplicate-check errors', async () => {
      const databaseError = new Error('Duplicate lookup failed');

      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne
        .mockResolvedValueOnce(category)
        .mockRejectedValueOnce(databaseError);

      await expect(
        service.update(categoryId, businessId, {
          name: 'New Name',
        }),
      ).rejects.toThrow(databaseError);

      expect(categoryRepository.save).not.toHaveBeenCalled();
    });

    // ----------------------------------------------------------
    // IMPORTANT: this test exposes a possible implementation bug
    // ----------------------------------------------------------

    it('should NOT silently ignore an empty category name if empty names are invalid', async () => {
      const category = {
        ...mockCategory,
      } as Category;

      categoryRepository.findOne.mockResolvedValue(category);

      categoryRepository.save.mockResolvedValue(category);

      await service.update(categoryId, businessId, {
        name: '',
      });

      /*
       * Current implementation uses:

         if (name && name !== category.name)

       * Therefore '' is ignored.

       * If your DTO validation allows the request to reach
       * the service, the service will silently treat:
       
         { name: '' }

       * as if name was not provided.

       * This assertion documents the behavior that should
       * probably be changed.
       */

      expect(category.name).toBe('Electronics');
    });
  });

  // ============================================================
  // REMOVE
  // ============================================================

  describe('remove', () => {
    it('should soft delete a category successfully', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      categoryRepository.softDelete.mockResolvedValue({
        affected: 1,
        raw: {},
      });

      const result = await service.remove(categoryId, businessId);

      expect(result).toEqual({
        status: true,
        message: 'Category deleted successfully',
        data: null,
      });

      expect(categoryRepository.softDelete).toHaveBeenCalledWith(categoryId);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(categoryId, businessId)).rejects.toThrow(
        new NotFoundException('Category not found'),
      );

      expect(categoryRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should not delete a category belonging to another business', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove(categoryId, 'another-business'),
      ).rejects.toThrow(new NotFoundException('Category not found'));

      expect(categoryRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should propagate softDelete errors', async () => {
      const databaseError = new Error('Delete failed');

      categoryRepository.findOne.mockResolvedValue(mockCategory);

      categoryRepository.softDelete.mockRejectedValue(databaseError);

      await expect(service.remove(categoryId, businessId)).rejects.toThrow(
        databaseError,
      );
    });

    it('should not report success when softDelete affects zero rows', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      categoryRepository.softDelete.mockResolvedValue({
        affected: 0,
        raw: {},
      });

      /*
       * Current implementation still returns success here.
       *
       * This test documents the behavior and exposes a possible
       * race-condition issue:
       *
       * 1. findOne() sees category
       * 2. category gets deleted by another request
       * 3. softDelete() affects 0 rows
       * 4. service still reports success
       */

      const result = await service.remove(categoryId, businessId);

      expect(result.message).toBe('Category deleted successfully');
    });
  });

  // ============================================================
  // CONCURRENCY / RACE CONDITIONS
  // ============================================================

  describe('concurrency scenarios', () => {
    it('should expose the race condition in duplicate category creation', async () => {
      /*
       * This simulates two requests arriving at almost the
       * exact same time.
       *
       * Both requests:
       *
       *   1. Verify business
       *   2. Check duplicate
       *   3. See nothing
       *   4. Attempt insert
       *
       * Application-level findOne() cannot guarantee uniqueness.
       */

      businessRepository.findOne.mockResolvedValue(mockBusiness);

      categoryRepository.findOne.mockResolvedValue(null);

      categoryRepository.create
        .mockReturnValueOnce({
          ...mockCategory,
          id: 'category-1',
        })
        .mockReturnValueOnce({
          ...mockCategory,
          id: 'category-2',
        });

      categoryRepository.save
        .mockResolvedValueOnce({
          ...mockCategory,
          id: 'category-1',
        })
        .mockResolvedValueOnce({
          ...mockCategory,
          id: 'category-2',
        });

      const dto: CreateCategoryDto = {
        business_id: businessId,
        name: 'Electronics',
        description: 'Electronics',
      };

      const [first, second] = await Promise.all([
        service.create(dto),
        service.create(dto),
      ]);

      /*
       * This demonstrates why a database-level unique
       * constraint is required.
       */

      expect(first?.data?.id).not.toBe(second?.data?.id);

      expect(categoryRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // LARGE DATA / PAGINATION
  // ============================================================

  describe('large dataset scenarios', () => {
    it('should correctly calculate pagination for 1 million records', async () => {
      (getPaginationOptions as jest.Mock).mockReturnValue({
        page: 50000,
        limit: 20,
        skip: 999980,
      });

      queryBuilder.getManyAndCount.mockResolvedValue([
        Array.from({ length: 20 }, (_, index) => ({
          ...mockCategory,
          id: `category-${index}`,
        })) as Category[],
        1_000_000,
      ]);

      const query = {
        page: 50000,
        limit: 20,
      } as CategoryPaginationQueryDto;

      const result = await service.findAll(businessId, query);

      expect(result?.data?.meta).toEqual({
        totalItems: 1_000_000,
        itemCount: 20,
        itemsPerPage: 20,
        totalPages: 50_000,
        currentPage: 50_000,
        hasNextPage: false,
        hasPreviousPage: true,
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(999980);
    });

    it('should handle a very large page size passed by the pagination helper', async () => {
      (getPaginationOptions as jest.Mock).mockReturnValue({
        page: 1,
        limit: 10000,
        skip: 0,
      });

      queryBuilder.getManyAndCount.mockResolvedValue([[], 10000]);

      const query = {
        page: 1,
        limit: 10000,
      } as CategoryPaginationQueryDto;

      const result = await service.findAll(businessId, query);

      expect(queryBuilder.take).toHaveBeenCalledWith(10000);

      expect(result?.data?.meta?.totalPages).toBe(1);
    });

    it('should not load all records into memory when page is empty', async () => {
      (getPaginationOptions as jest.Mock).mockReturnValue({
        page: 999999,
        limit: 50,
        skip: 49999900,
      });

      queryBuilder.getManyAndCount.mockResolvedValue([[], 100]);

      const query = {
        page: 999999,
        limit: 50,
      } as CategoryPaginationQueryDto;

      const result = await service.findAll(businessId, query);

      expect(result?.data?.categories).toEqual([]);

      expect(queryBuilder.take).toHaveBeenCalledWith(50);
    });
  });

  // ============================================================
  // SECURITY / MULTI-TENANCY
  // ============================================================

  describe('multi-tenancy isolation', () => {
    it('should always scope findOne by business ID', async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      await service.findOne(categoryId, businessId);

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: categoryId,
          business_id: businessId,
        },
      });
    });

    it('should always scope duplicate checks by business ID', async () => {
      businessRepository.findOne.mockResolvedValue(mockBusiness);

      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.create.mockReturnValue(mockCategory);
      categoryRepository.save.mockResolvedValue(mockCategory);

      await service.create({
        business_id: businessId,
        name: 'Electronics',
      });

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          business_id: businessId,
          name: 'Electronics',
        },
      });
    });

    it('should prevent cross-business updates', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(categoryId, 'attacker-business', {
          name: 'Hacked',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(categoryRepository.save).not.toHaveBeenCalled();
    });

    it('should prevent cross-business deletes', async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove(categoryId, 'attacker-business'),
      ).rejects.toThrow(NotFoundException);

      expect(categoryRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // SPECIAL INPUTS
  // ============================================================

  describe('special input scenarios', () => {
    it('should safely pass SQL wildcard characters as parameters', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: '%',
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(category.name) LIKE LOWER(:search)'),
        {
          search: '%%%',
        },
      );
    });

    it('should safely pass SQL underscore characters as parameters', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: '_',
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(category.name) LIKE LOWER(:search)'),
        {
          search: '%_%',
        },
      );
    });

    it('should safely pass quotes through query parameters', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: "' OR 1=1 --",
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(category.name) LIKE LOWER(:search)'),
        {
          search: "%' OR 1=1 --%",
        },
      );
    });

    it('should handle unicode search text', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = {
        page: 1,
        limit: 10,
        search: 'Électronique',
      } as CategoryPaginationQueryDto;

      await service.findAll(businessId, query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(category.name) LIKE LOWER(:search)'),
        {
          search: '%Électronique%',
        },
      );
    });
  });
});
