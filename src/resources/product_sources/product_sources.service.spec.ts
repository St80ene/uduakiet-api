// import { Test, TestingModule } from '@nestjs/testing';
// import { ProductSourcesService } from './product_sources.service';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import { ProductSource } from './entities/product_source.entity';
// import { NotFoundException } from '@nestjs/common';
// import { successResponse } from '../../utils/response.utils';

// describe('ProductSourcesService', () => {
//   let service: ProductSourcesService;

//   const mockDto = {
//     product_id: '857cbvhvsjaj4865bvh',
//     supplier_id: '723cbvhfvvbhf4865b',
//   };

//   const mockProductSourcesRepository = {
//     create: jest.fn(),
//     findOne: jest.fn(),
//     update: jest.fn(),
//     remove: jest.fn(),
//     merge: jest.fn(),
//     save: jest.fn(),
//     findAndCount: jest.fn(),
//     find: jest.fn(),
//   };

//   beforeEach(async () => {
//     jest.resetAllMocks();
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         ProductSourcesService,
//         {
//           provide: getRepositoryToken(ProductSource),
//           useValue: mockProductSourcesRepository,
//         },
//       ],
//     }).compile();

//     service = module.get<ProductSourcesService>(ProductSourcesService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   describe('create', () => {
//     it('it should be defined', () => {
//       expect(service.create(mockDto)).toBeDefined();
//     });

//     it('should call the repository create method with the correct parameters', async () => {
//       const mockProductSource = { id: 'uuid-1234', ...mockDto };

//       mockProductSourcesRepository.create.mockReturnValue(mockProductSource);
//       mockProductSourcesRepository.save.mockReturnValue(mockProductSource);

//       const result = await service.create(mockDto);
//       expect(mockProductSourcesRepository.create).toHaveBeenCalledWith(mockDto);
//       expect(mockProductSourcesRepository.save).toHaveBeenCalledWith(
//         mockProductSource,
//       );
//       expect(result).toEqual(
//         successResponse(
//           'Product Source created successfully',
//           mockProductSource,
//         ),
//       );
//     });

//     const mockProductSource = { id: '1', ...mockDto };

//     it('should successfully create and save a product source', async () => {
//       mockProductSourcesRepository.create.mockReturnValue(mockProductSource);
//       mockProductSourcesRepository.save.mockResolvedValue(mockProductSource);

//       const result = await service.create(mockDto);

//       expect(mockProductSourcesRepository.create).toHaveBeenCalledWith(mockDto);
//       expect(mockProductSourcesRepository.save).toHaveBeenCalledWith(
//         mockProductSource,
//       );
//       expect(result).toEqual(
//         successResponse(
//           'Product Source created successfully',
//           mockProductSource,
//         ),
//       );
//     });

//     it('should propagate database errors when saving fails', async () => {
//       mockProductSourcesRepository.create.mockReturnValue(mockProductSource);
//       mockProductSourcesRepository.save.mockRejectedValue(
//         new Error('DB Error'),
//       );

//       await expect(service.create(mockDto)).rejects.toThrow('DB Error');
//     });
//   });

//   describe('findOne', () => {
//     it('should return a product source if found', async () => {
//       const mockProductSource = {
//         id: 'uuid-1234',
//         product_id: 'p1',
//         supplier_id: 's1',
//       };
//       mockProductSourcesRepository.findOne.mockResolvedValue(mockProductSource);

//       const result = await service.findOne('uuid-1234');

//       expect(result).toEqual(
//         successResponse('Product Source retrieved', mockProductSource),
//       );
//       expect(mockProductSourcesRepository.findOne).toHaveBeenCalledWith({
//         where: { id: 'uuid-1234' },
//       });
//     });

//     it('should throw NotFoundException if product source is not found', async () => {
//       // 1. Simulate TypeORM returning null when no record matches
//       mockProductSourcesRepository.findOne.mockResolvedValue(null);

//       // 2. Await the assertion using .rejects.toThrow()
//       await expect(service.findOne('uuid-1234')).rejects.toThrow(
//         NotFoundException,
//       );
//     });
//   });

//   describe('findAll', () => {
//     const mockPaginationQuery = { page: 1, limit: 10 };
//     it('should return an array of product sources', async () => {
//       const mockProductSources = [
//         { id: 'uuid-1', product_id: 'p1', supplier_id: 's1' },
//         { id: 'uuid-2', product_id: 'p2', supplier_id: 's2' },
//       ];
//       mockProductSourcesRepository.findAndCount.mockResolvedValue([
//         mockProductSources,
//         mockProductSources.length,
//       ]);

//       const result = await service.findAll(mockPaginationQuery);

//       expect(mockProductSourcesRepository.findAndCount).toHaveBeenCalledWith({
//         skip: 0,
//         take: 10,
//         order: { created_at: 'DESC' },
//       });
//       expect(result).toEqual(
//         successResponse('Product sources retrieved successfully', {
//           productSources: mockProductSources,
//           meta: {
//             total: mockProductSources.length,
//             page: 1,
//             limit: 10,
//             totalPages: 1,
//           },
//         }),
//       );
//     });

//     it('should return an empty array if no product sources exist', async () => {
//       mockProductSourcesRepository.findAndCount.mockResolvedValue([[], 0]);

//       const result = await service.findAll(mockPaginationQuery);

//       expect(mockProductSourcesRepository.findAndCount).toHaveBeenCalled();
//       expect(result).toEqual(
//         successResponse('Product sources retrieved successfully', {
//           productSources: [],
//           meta: {
//             total: 0,
//             page: 1,
//             limit: 10,
//             totalPages: 0,
//           },
//         }),
//       );
//     });

//     it('should propagate database errors when find fails', async () => {
//       mockProductSourcesRepository.findAndCount.mockRejectedValue(
//         new Error('Database connection lost'),
//       );

//       await expect(service.findAll(mockPaginationQuery)).rejects.toThrow(
//         'Database connection lost',
//       );
//     });
//   });

//   describe('update', () => {
//     const updateDto = { supplier_id: 'Updated Supplier ID' };
//     const existingProductSource = {
//       id: 'uuid-1234',
//       supplier_id: 'Updated Supplier ID',
//     };
//     const updatedProductSource = { ...existingProductSource, ...updateDto };

//     it('should successfully update and return the updated product source', async () => {
//       // Mock finding the entity first (or preload depending on service implementation)
//       mockProductSourcesRepository.findOne.mockResolvedValue(
//         existingProductSource,
//       );
//       mockProductSourcesRepository.save.mockResolvedValue(updatedProductSource);

//       const result = await service.update('uuid-1234', updateDto);

//       expect(mockProductSourcesRepository.findOne).toHaveBeenCalledWith({
//         where: { id: 'uuid-1234' },
//       });
//       expect(mockProductSourcesRepository.save).toHaveBeenCalledWith({
//         ...existingProductSource,
//         ...updateDto,
//       });
//       expect(result).toEqual(
//         successResponse(
//           'Product Source updated successfully',
//           updatedProductSource,
//         ),
//       );
//     });

//     it('should throw NotFoundException if product source to update is not found', async () => {
//       mockProductSourcesRepository.findOne.mockResolvedValue(null);

//       await expect(
//         service.update('non-existent-id', updateDto),
//       ).rejects.toThrow('Product Source with ID non-existent-id not found');
//     });

//     it('should propagate database errors when update save fails', async () => {
//       mockProductSourcesRepository.findOne.mockResolvedValue(
//         existingProductSource,
//       );
//       mockProductSourcesRepository.save.mockRejectedValue(
//         new Error('DB Update Error'),
//       );

//       await expect(service.update('uuid-1234', updateDto)).rejects.toThrow(
//         'DB Update Error',
//       );
//     });
//   });

//   describe('remove', () => {
//     const mockProductSource = { id: 'uuid-1234', ...mockDto };

//     it('should successfully remove the product source', async () => {
//       // If service finds the entity before removing it
//       mockProductSourcesRepository.findOne.mockResolvedValue(mockProductSource);
//       mockProductSourcesRepository.remove.mockResolvedValue(mockProductSource);

//       const result = await service.remove('uuid-1234');

//       expect(mockProductSourcesRepository.findOne).toHaveBeenCalledWith({
//         where: { id: 'uuid-1234' },
//       });
//       expect(mockProductSourcesRepository.remove).toHaveBeenCalledWith(
//         mockProductSource,
//       );
//       expect(result).toEqual(
//         successResponse('Product Source deleted successfully', null),
//       );
//     });

//     it('should throw NotFoundException if product source to remove is not found', async () => {
//       mockProductSourcesRepository.findOne.mockResolvedValue(null);

//       await expect(service.remove('non-existent-id')).rejects.toThrow(
//         'Product Source with ID non-existent-id not found',
//       );
//     });

//     it('should propagate errors if repository delete/remove fails', async () => {
//       mockProductSourcesRepository.findOne.mockResolvedValue(mockProductSource);
//       mockProductSourcesRepository.remove.mockRejectedValue(
//         new Error('Foreign key constraint violation'),
//       );

//       await expect(service.remove('uuid-1234')).rejects.toThrow(
//         'Foreign key constraint violation',
//       );
//     });
//   });
// });
