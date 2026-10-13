// import { Test, TestingModule } from '@nestjs/testing';
// import { ProductSourcesController } from './product_sources.controller';
// import { ProductSourcesService } from './product_sources.service';

// describe('ProductSourcesController', () => {
//   let controller: ProductSourcesController;

//   const mockProductSourcesService = {
//     create: jest.fn(),
//     findOne: jest.fn(),
//     findAll: jest.fn(),
//     update: jest.fn(),
//     remove: jest.fn(),
//   };

//   const createProductSourceDto = {
//     product_id: '857cbvhvsjaj4865bvh',
//     supplier_id: '857cbvhfvvbhf4865bvh',
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [ProductSourcesController],
//       providers: [
//         {
//           provide: ProductSourcesService,
//           useValue: mockProductSourcesService,
//         },
//       ],
//     }).compile();

//     controller = module.get<ProductSourcesController>(ProductSourcesController);
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });

//   describe('create', () => {
//     it('should call productSourcesService.create with the correct parameters', async () => {
//       await controller.create(createProductSourceDto);
//       expect(mockProductSourcesService.create).toHaveBeenCalledWith(
//         createProductSourceDto,
//       );
//     });
//   });

//   describe('findOne', () => {
//     it('should call productSourcesService.findOne with the correct parameters', async () => {
//       const id = 'some-uuid';
//       await controller.findOne(id);
//       expect(mockProductSourcesService.findOne).toHaveBeenCalledWith(id);
//     });
//   });

//   describe('findAll', () => {
//     it('should call productSourcesService.findAll with the correct parameters', async () => {
//       const query = { page: 1, limit: 10 };
//       await controller.findAll(query);
//       expect(mockProductSourcesService.findAll).toHaveBeenCalledWith(query);
//     });
//   });

//   describe('update', () => {
//     it('should call productSourcesService.update with the correct parameters', async () => {
//       const id = 'some-uuid';
//       const updateProductSourceDto = { product_id: 'new-product-id' };
//       await controller.update(id, updateProductSourceDto);
//       expect(mockProductSourcesService.update).toHaveBeenCalledWith(
//         id,
//         updateProductSourceDto,
//       );
//     });
//   });

//   describe('remove', () => {
//     it('should call productSourcesService.remove with the correct parameters', async () => {
//       const id = 'some-uuid';
//       await controller.remove(id);
//       expect(mockProductSourcesService.remove).toHaveBeenCalledWith(id);
//     });
//   });
// });
