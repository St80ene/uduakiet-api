// import { ConflictException, NotFoundException } from '@nestjs/common';

// import { CategoriesController } from './categories.controller';
// import { CategoriesService } from './categories.service';
// import { CreateCategoryDto } from './dto/create-category.dto';
// import { UpdateCategoryDto } from './dto/update-category.dto';
// import { BasePaginationQueryDto } from '../../common/dto/pagination-query.dto';

// describe('CategoriesController', () => {
//   let controller: CategoriesController;

//   let categoriesService: {
//     create: jest.Mock;
//     findAll: jest.Mock;
//     findOne: jest.Mock;
//     update: jest.Mock;
//     remove: jest.Mock;
//   };

//   const businessId = 'business-1';
//   const categoryId = 'category-1';

//   const mockCategory = {
//     id: categoryId,
//     business_id: businessId,
//     name: 'Electronics',
//     description: 'Electronic products',
//   };

//   const mockSuccessResponse = {
//     success: true,
//     message: 'Category retrieved successfully',
//     data: mockCategory,
//   };

//   beforeEach(() => {
//     categoriesService = {
//       create: jest.fn(),
//       findAll: jest.fn(),
//       findOne: jest.fn(),
//       update: jest.fn(),
//       remove: jest.fn(),
//     };

//     controller = new CategoriesController(
//       categoriesService as unknown as CategoriesService,
//     );
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   // ============================================================
//   // CREATE
//   // ============================================================

//   describe('create', () => {
//     it('should create a category', async () => {
//       const dto: CreateCategoryDto = {
//         business_id: businessId,
//         name: 'Electronics',
//         description: 'Electronic products',
//       };

//       categoriesService.create.mockResolvedValue(mockSuccessResponse);

//       const result = await controller.create(dto);

//       expect(result).toBe(mockSuccessResponse);

//       expect(categoriesService.create).toHaveBeenCalledWith(dto);

//       expect(categoriesService.create).toHaveBeenCalledTimes(1);
//     });

//     it('should pass the exact DTO object to the service', async () => {
//       const dto: CreateCategoryDto = {
//         business_id: businessId,
//         name: 'Electronics',
//         description: 'Electronic products',
//       };

//       categoriesService.create.mockResolvedValue(mockSuccessResponse);

//       await controller.create(dto);

//       expect(categoriesService.create).toHaveBeenCalledWith(dto);
//     });

//     it('should support a DTO without description', async () => {
//       const dto: CreateCategoryDto = {
//         business_id: businessId,
//         name: 'Electronics',
//       };

//       categoriesService.create.mockResolvedValue(mockSuccessResponse);

//       await controller.create(dto);

//       expect(categoriesService.create).toHaveBeenCalledWith(dto);
//     });

//     it('should pass an empty DTO to the service unchanged', async () => {
//       const dto = {} as CreateCategoryDto;

//       categoriesService.create.mockResolvedValue(mockSuccessResponse);

//       await controller.create(dto);

//       expect(categoriesService.create).toHaveBeenCalledWith(dto);
//     });

//     it('should preserve unusual string values', async () => {
//       const dto = {
//         business_id: '   business-id   ',
//         name: '  Electronics  ',
//         description: '',
//       } as CreateCategoryDto;

//       categoriesService.create.mockResolvedValue(mockSuccessResponse);

//       await controller.create(dto);

//       expect(categoriesService.create).toHaveBeenCalledWith(dto);
//     });

//     it('should pass very long category names unchanged', async () => {
//       const dto = {
//         business_id: businessId,
//         name: 'A'.repeat(10_000),
//         description: 'B'.repeat(50_000),
//       } as CreateCategoryDto;

//       categoriesService.create.mockResolvedValue(mockSuccessResponse);

//       await controller.create(dto);

//       expect(categoriesService.create).toHaveBeenCalledWith(dto);
//     });

//     it('should pass special characters unchanged', async () => {
//       const dto = {
//         business_id: businessId,
//         name: `"Electronics" <script>alert('xss')</script>`,
//         description: `' OR 1=1 --`,
//       } as CreateCategoryDto;

//       categoriesService.create.mockResolvedValue(mockSuccessResponse);

//       await controller.create(dto);

//       expect(categoriesService.create).toHaveBeenCalledWith(dto);
//     });

//     it('should pass unicode values unchanged', async () => {
//       const dto = {
//         business_id: businessId,
//         name: 'Électronique 📱',
//         description: '電子产品',
//       } as CreateCategoryDto;

//       categoriesService.create.mockResolvedValue(mockSuccessResponse);

//       await controller.create(dto);

//       expect(categoriesService.create).toHaveBeenCalledWith(dto);
//     });

//     it('should propagate ConflictException from the service', async () => {
//       const dto: CreateCategoryDto = {
//         business_id: businessId,
//         name: 'Electronics',
//       };

//       const error = new ConflictException('Category already exists');

//       categoriesService.create.mockRejectedValue(error);

//       await expect(controller.create(dto)).rejects.toBe(error);
//     });

//     it('should propagate NotFoundException from the service', async () => {
//       const dto: CreateCategoryDto = {
//         business_id: 'missing-business',
//         name: 'Electronics',
//       };

//       const error = new NotFoundException('Business not found');

//       categoriesService.create.mockRejectedValue(error);

//       await expect(controller.create(dto)).rejects.toBe(error);
//     });

//     it('should propagate unexpected service errors', async () => {
//       const error = new Error('Database connection lost');

//       categoriesService.create.mockRejectedValue(error);

//       await expect(controller.create({} as CreateCategoryDto)).rejects.toBe(
//         error,
//       );
//     });

//     it('should return null if the service returns null', async () => {
//       categoriesService.create.mockResolvedValue(null);

//       const result = await controller.create({} as CreateCategoryDto);

//       expect(result).toBeNull();
//     });

//     it('should return undefined if the service returns undefined', async () => {
//       categoriesService.create.mockResolvedValue(undefined);

//       const result = await controller.create({} as CreateCategoryDto);

//       expect(result).toBeUndefined();
//     });
//   });

//   // ============================================================
//   // FIND ALL
//   // ============================================================

//   describe('findAll', () => {
//     const paginationQuery = {
//       page: 1,
//       limit: 10,
//       search: 'electronics',
//       order: 'DESC',
//       sortBy: 'created_at',
//     } as BasePaginationQueryDto;

//     it('should retrieve all categories for a business', async () => {
//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       const result = await controller.findAll(businessId, paginationQuery);

//       expect(result).toBe(mockSuccessResponse);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(
//         businessId,
//         paginationQuery,
//       );

//       expect(categoriesService.findAll).toHaveBeenCalledTimes(1);
//     });

//     it('should pass the exact business ID to the service', async () => {
//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       await controller.findAll(businessId, paginationQuery);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(
//         businessId,
//         paginationQuery,
//       );
//     });

//     it('should pass an empty pagination query unchanged', async () => {
//       const query = {} as BasePaginationQueryDto;

//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       await controller.findAll(businessId, query);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(businessId, query);
//     });

//     it('should support page one', async () => {
//       const query = {
//         page: 1,
//         limit: 10,
//       } as BasePaginationQueryDto;

//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       await controller.findAll(businessId, query);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(businessId, query);
//     });

//     it('should pass large pagination values unchanged', async () => {
//       const query = {
//         page: 999_999,
//         limit: 10_000,
//       } as BasePaginationQueryDto;

//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       await controller.findAll(businessId, query);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(businessId, query);
//     });

//     it('should pass negative pagination values to the service', async () => {
//       /*
//        * The controller does not validate pagination itself.
//        * DTO validation should normally handle this.
//        *
//        * This test verifies that the controller does not silently
//        * mutate the request.
//        */
//       const query = {
//         page: -100,
//         limit: -50,
//       } as BasePaginationQueryDto;

//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       await controller.findAll(businessId, query);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(businessId, query);
//     });

//     it('should pass a huge search string unchanged', async () => {
//       const query = {
//         page: 1,
//         limit: 10,
//         search: 'A'.repeat(100_000),
//       } as BasePaginationQueryDto;

//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       await controller.findAll(businessId, query);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(businessId, query);
//     });

//     it('should pass special search characters unchanged', async () => {
//       const query = {
//         page: 1,
//         limit: 10,
//         search: `%_' OR 1=1 --`,
//       } as BasePaginationQueryDto;

//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       await controller.findAll(businessId, query);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(businessId, query);
//     });

//     it('should pass unicode search values unchanged', async () => {
//       const query = {
//         page: 1,
//         limit: 10,
//         search: 'Électronique 📱 電子',
//       } as BasePaginationQueryDto;

//       categoriesService.findAll.mockResolvedValue(mockSuccessResponse);

//       await controller.findAll(businessId, query);

//       expect(categoriesService.findAll).toHaveBeenCalledWith(businessId, query);
//     });

//     it('should propagate service errors', async () => {
//       const error = new Error('Database failure');

//       categoriesService.findAll.mockRejectedValue(error);

//       await expect(
//         controller.findAll(businessId, paginationQuery),
//       ).rejects.toBe(error);
//     });

//     it('should propagate NotFoundException from the service', async () => {
//       const error = new NotFoundException('Business not found');

//       categoriesService.findAll.mockRejectedValue(error);

//       await expect(
//         controller.findAll(businessId, paginationQuery),
//       ).rejects.toBe(error);
//     });
//   });

//   // ============================================================
//   // FIND ONE
//   // ============================================================

//   describe('findOne', () => {
//     it('should retrieve one category', async () => {
//       categoriesService.findOne.mockResolvedValue(mockSuccessResponse);

//       const result = await controller.findOne(categoryId, businessId);

//       expect(result).toBe(mockSuccessResponse);

//       expect(categoriesService.findOne).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//       );

//       expect(categoriesService.findOne).toHaveBeenCalledTimes(1);
//     });

//     it('should pass id and businessId in the correct order', async () => {
//       categoriesService.findOne.mockResolvedValue(mockSuccessResponse);

//       await controller.findOne('category-123', 'business-456');

//       expect(categoriesService.findOne).toHaveBeenCalledWith(
//         'category-123',
//         'business-456',
//       );
//     });

//     it('should handle empty IDs', async () => {
//       categoriesService.findOne.mockResolvedValue(mockSuccessResponse);

//       await controller.findOne('', '');

//       expect(categoriesService.findOne).toHaveBeenCalledWith('', '');
//     });

//     it('should handle whitespace IDs', async () => {
//       categoriesService.findOne.mockResolvedValue(mockSuccessResponse);

//       await controller.findOne('   ', '   ');

//       expect(categoriesService.findOne).toHaveBeenCalledWith('   ', '   ');
//     });

//     it('should pass very long IDs unchanged', async () => {
//       const id = 'a'.repeat(100_000);

//       categoriesService.findOne.mockResolvedValue(mockSuccessResponse);

//       await controller.findOne(id, id);

//       expect(categoriesService.findOne).toHaveBeenCalledWith(id, id);
//     });

//     it('should pass unusual ID characters unchanged', async () => {
//       const id = `' OR 1=1 -- <script>`;

//       categoriesService.findOne.mockResolvedValue(mockSuccessResponse);

//       await controller.findOne(id, id);

//       expect(categoriesService.findOne).toHaveBeenCalledWith(id, id);
//     });

//     it('should propagate NotFoundException', async () => {
//       const error = new NotFoundException('Category not found');

//       categoriesService.findOne.mockRejectedValue(error);

//       await expect(controller.findOne(categoryId, businessId)).rejects.toBe(
//         error,
//       );
//     });

//     it('should propagate unexpected service errors', async () => {
//       const error = new Error('Unexpected failure');

//       categoriesService.findOne.mockRejectedValue(error);

//       await expect(controller.findOne(categoryId, businessId)).rejects.toBe(
//         error,
//       );
//     });
//   });

//   // ============================================================
//   // UPDATE
//   // ============================================================

//   describe('update', () => {
//     it('should update a category', async () => {
//       const dto: UpdateCategoryDto = {
//         name: 'Updated Electronics',
//         description: 'Updated description',
//       };

//       categoriesService.update.mockResolvedValue(mockSuccessResponse);

//       const result = await controller.update(categoryId, businessId, dto);

//       expect(result).toBe(mockSuccessResponse);

//       expect(categoriesService.update).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//         dto,
//       );

//       expect(categoriesService.update).toHaveBeenCalledTimes(1);
//     });

//     it('should pass the exact DTO object to the service', async () => {
//       const dto: UpdateCategoryDto = {
//         name: 'Updated',
//       };

//       categoriesService.update.mockResolvedValue(mockSuccessResponse);

//       await controller.update(categoryId, businessId, dto);

//       expect(categoriesService.update).toHaveBeenNthCalledWith(
//         1,
//         categoryId,
//         businessId,
//         dto,
//       );
//     });

//     it('should support updating only the name', async () => {
//       const dto: UpdateCategoryDto = {
//         name: 'Clothing',
//       };

//       categoriesService.update.mockResolvedValue(mockSuccessResponse);

//       await controller.update(categoryId, businessId, dto);

//       expect(categoriesService.update).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//         dto,
//       );
//     });

//     it('should support updating only the description', async () => {
//       const dto: UpdateCategoryDto = {
//         description: 'New description',
//       };

//       categoriesService.update.mockResolvedValue(mockSuccessResponse);

//       await controller.update(categoryId, businessId, dto);

//       expect(categoriesService.update).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//         dto,
//       );
//     });

//     it('should pass an empty update DTO unchanged', async () => {
//       const dto = {} as UpdateCategoryDto;

//       categoriesService.update.mockResolvedValue(mockSuccessResponse);

//       await controller.update(categoryId, businessId, dto);

//       expect(categoriesService.update).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//         dto,
//       );
//     });

//     it('should pass an empty name unchanged', async () => {
//       const dto = {
//         name: '',
//       } as UpdateCategoryDto;

//       categoriesService.update.mockResolvedValue(mockSuccessResponse);

//       await controller.update(categoryId, businessId, dto);

//       expect(categoriesService.update).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//         dto,
//       );
//     });

//     it('should pass null values unchanged', async () => {
//       const dto = {
//         name: null,
//         description: null,
//       } as unknown as UpdateCategoryDto;

//       categoriesService.update.mockResolvedValue(mockSuccessResponse);

//       await controller.update(categoryId, businessId, dto);

//       expect(categoriesService.update).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//         dto,
//       );
//     });

//     it('should pass very large update payloads unchanged', async () => {
//       const dto = {
//         name: 'A'.repeat(100_000),
//         description: 'B'.repeat(1_000_000),
//       } as UpdateCategoryDto;

//       categoriesService.update.mockResolvedValue(mockSuccessResponse);

//       await controller.update(categoryId, businessId, dto);

//       expect(categoriesService.update).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//         dto,
//       );
//     });

//     it('should propagate ConflictException', async () => {
//       const error = new ConflictException('Category already exists');

//       categoriesService.update.mockRejectedValue(error);

//       await expect(
//         controller.update(categoryId, businessId, {
//           name: 'Clothing',
//         }),
//       ).rejects.toBe(error);
//     });

//     it('should propagate NotFoundException', async () => {
//       const error = new NotFoundException('Category not found');

//       categoriesService.update.mockRejectedValue(error);

//       await expect(
//         controller.update(categoryId, businessId, {
//           name: 'Clothing',
//         }),
//       ).rejects.toBe(error);
//     });

//     it('should propagate unexpected service errors', async () => {
//       const error = new Error('Database unavailable');

//       categoriesService.update.mockRejectedValue(error);

//       await expect(controller.update(categoryId, businessId, {})).rejects.toBe(
//         error,
//       );
//     });
//   });

//   // ============================================================
//   // REMOVE
//   // ============================================================

//   describe('remove', () => {
//     it('should remove a category', async () => {
//       const response = {
//         success: true,
//         message: 'Category deleted successfully',
//         data: null,
//       };

//       categoriesService.remove.mockResolvedValue(response);

//       const result = await controller.remove(categoryId, businessId);

//       expect(result).toBe(response);

//       expect(categoriesService.remove).toHaveBeenCalledWith(
//         categoryId,
//         businessId,
//       );

//       expect(categoriesService.remove).toHaveBeenCalledTimes(1);
//     });

//     it('should pass id and businessId in the correct order', async () => {
//       categoriesService.remove.mockResolvedValue(mockSuccessResponse);

//       await controller.remove('category-123', 'business-456');

//       expect(categoriesService.remove).toHaveBeenCalledWith(
//         'category-123',
//         'business-456',
//       );
//     });

//     it('should handle empty IDs', async () => {
//       categoriesService.remove.mockResolvedValue(mockSuccessResponse);

//       await controller.remove('', '');

//       expect(categoriesService.remove).toHaveBeenCalledWith('', '');
//     });

//     it('should handle whitespace IDs', async () => {
//       categoriesService.remove.mockResolvedValue(mockSuccessResponse);

//       await controller.remove('   ', '   ');

//       expect(categoriesService.remove).toHaveBeenCalledWith('   ', '   ');
//     });

//     it('should propagate NotFoundException', async () => {
//       const error = new NotFoundException('Category not found');

//       categoriesService.remove.mockRejectedValue(error);

//       await expect(controller.remove(categoryId, businessId)).rejects.toBe(
//         error,
//       );
//     });

//     it('should propagate unexpected service errors', async () => {
//       const error = new Error('Database connection failed');

//       categoriesService.remove.mockRejectedValue(error);

//       await expect(controller.remove(categoryId, businessId)).rejects.toBe(
//         error,
//       );
//     });
//   });

//   // ============================================================
//   // CONCURRENCY
//   // ============================================================

//   describe('concurrent requests', () => {
//     it('should correctly forward concurrent create requests', async () => {
//       const dto1 = {
//         business_id: businessId,
//         name: 'Electronics',
//       } as CreateCategoryDto;

//       const dto2 = {
//         business_id: businessId,
//         name: 'Clothing',
//       } as CreateCategoryDto;

//       categoriesService.create
//         .mockResolvedValueOnce({
//           data: { id: 'category-1' },
//         })
//         .mockResolvedValueOnce({
//           data: { id: 'category-2' },
//         });

//       const [result1, result2] = await Promise.all([
//         controller.create(dto1),
//         controller.create(dto2),
//       ]);

//       expect(result1?.data?.id).toBe('category-1');
//       expect(result2?.data?.id).toBe('category-2');

//       expect(categoriesService.create).toHaveBeenCalledTimes(2);

//       expect(categoriesService.create).toHaveBeenNthCalledWith(1, dto1);

//       expect(categoriesService.create).toHaveBeenNthCalledWith(2, dto2);
//     });

//     it('should correctly forward concurrent findOne requests', async () => {
//       categoriesService.findOne
//         .mockResolvedValueOnce({
//           data: { id: 'category-1' },
//         })
//         .mockResolvedValueOnce({
//           data: { id: 'category-2' },
//         });

//       const [result1, result2] = await Promise.all([
//         controller.findOne('category-1', 'business-1'),
//         controller.findOne('category-2', 'business-2'),
//       ]);

//       expect(result1?.data?.id).toBe('category-1');
//       expect(result2?.data?.id).toBe('category-2');

//       expect(categoriesService.findOne).toHaveBeenCalledTimes(2);
//     });

//     it('should correctly handle one concurrent request failing', async () => {
//       const error = new NotFoundException('Category not found');

//       categoriesService.findOne
//         .mockResolvedValueOnce({
//           data: mockCategory,
//         })
//         .mockRejectedValueOnce(error);

//       const results = await Promise.allSettled([
//         controller.findOne('category-1', 'business-1'),
//         controller.findOne('missing', 'business-1'),
//       ]);

//       expect(results[0].status).toBe('fulfilled');
//       expect(results[1].status).toBe('rejected');

//       if (results[1].status === 'rejected') {
//         expect(results[1].reason).toBe(error);
//       }
//     });
//   });

//   // ============================================================
//   // CONTROLLER TRANSPARENCY
//   // ============================================================

//   describe('service response transparency', () => {
//     it('should return exactly what create returns', async () => {
//       const response = {
//         completely: 'different',
//         nested: {
//           value: 123,
//         },
//       };

//       categoriesService.create.mockResolvedValue(response);

//       const result = await controller.create({} as CreateCategoryDto);

//       expect(result).toBe(response);
//     });

//     it('should return exactly what findAll returns', async () => {
//       const response = {
//         categories: [],
//         meta: {
//           totalItems: 0,
//         },
//       };

//       categoriesService.findAll.mockResolvedValue(response);

//       const result = await controller.findAll(businessId, {});

//       expect(result).toBe(response);
//     });

//     it('should return exactly what findOne returns', async () => {
//       const response = {
//         anything: true,
//       };

//       categoriesService.findOne.mockResolvedValue(response);

//       const result = await controller.findOne(categoryId, businessId);

//       expect(result).toBe(response);
//     });

//     it('should return exactly what update returns', async () => {
//       const response = {
//         updated: true,
//       };

//       categoriesService.update.mockResolvedValue(response);

//       const result = await controller.update(categoryId, businessId, {});

//       expect(result).toBe(response);
//     });

//     it('should return exactly what remove returns', async () => {
//       const response = {
//         deleted: true,
//       };

//       categoriesService.remove.mockResolvedValue(response);

//       const result = await controller.remove(categoryId, businessId);

//       expect(result).toBe(response);
//     });
//   });
// });
