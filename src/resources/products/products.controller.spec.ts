// import { Test, TestingModule } from '@nestjs/testing';
// import { ProductsController } from './products.controller';
// import { ProductsService } from './products.service';
// import { CreateProductDto } from './dto/create-product.dto';
// import {
//   BadRequestException,
//   InternalServerErrorException,
// } from '@nestjs/common';
// import {
//   UomBaseName,
//   UomDisplayName,
//   UomType,
// } from './entities/product.entity';

// describe('ProductsController', () => {
//   let controller: ProductsController;

//   const mockProductsService = {
//     create: jest.fn(),
//     findAll: jest.fn(),
//     findOne: jest.fn(),
//     update: jest.fn(),
//     remove: jest.fn(),
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [ProductsController],
//       providers: [
//         {
//           provide: ProductsService,
//           useValue: mockProductsService,
//         },
//       ],
//     }).compile();

//     controller = module.get<ProductsController>(ProductsController);
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });

//   describe('POST /products (create)', () => {
//     const createDto: CreateProductDto = {
//       name: 'Rice',
//       cost_price: 1000,
//       category: 'Food',
//       selling_price: 1500,
//       stock_quantity: 50,
//       reorder_level: 10,
//       uom_type: UomType.WEIGHT,
//       uom_base_name: UomBaseName.G,
//       uom_display_name: UomDisplayName.G,
//     };

//     const createMockFile = (filename = 'rice.png'): Express.Multer.File =>
//       ({
//         fieldname: 'images',
//         originalname: filename,
//         encoding: '7bit',
//         mimetype: 'image/png',
//         buffer: Buffer.from('mock-image'),
//         size: 1024,
//         destination: '',
//         filename,
//         path: '',
//         stream: null,
//       }) as unknown as Express.Multer.File;

//     it('should create a product without uploaded images', async () => {
//       const mockResponse = {
//         success: true,
//         message: 'Product created successfully',
//         data: {
//           id: 'product-id',
//           ...createDto,
//         },
//       };

//       mockProductsService.create.mockResolvedValue(mockResponse);

//       const result = await controller.create(createDto);

//       expect(mockProductsService.create).toHaveBeenCalledWith(
//         createDto,
//         undefined,
//       );

//       expect(result).toEqual(mockResponse);
//     });

//     it('should create a product with one uploaded image', async () => {
//       const files = [createMockFile()];

//       const mockResponse = {
//         success: true,
//         message: 'Product created successfully',
//         data: {
//           id: 'product-id',
//           ...createDto,
//         },
//       };

//       mockProductsService.create.mockResolvedValue(mockResponse);

//       const result = await controller.create(createDto, files);

//       expect(mockProductsService.create).toHaveBeenCalledWith(createDto, files);

//       expect(result).toEqual(mockResponse);
//     });

//     it('should create a product with multiple uploaded images', async () => {
//       const files = [
//         createMockFile('1.png'),
//         createMockFile('2.png'),
//         createMockFile('3.png'),
//       ];

//       const mockResponse = {
//         success: true,
//         message: 'Product created successfully',
//         data: {
//           id: 'product-id',
//           ...createDto,
//         },
//       };

//       mockProductsService.create.mockResolvedValue(mockResponse);

//       const result = await controller.create(createDto, files);

//       expect(mockProductsService.create).toHaveBeenCalledWith(createDto, files);

//       expect(result).toEqual(mockResponse);
//     });

//     it('should propagate BadRequestException from the service', async () => {
//       mockProductsService.create.mockRejectedValue(
//         new BadRequestException('Invalid product payload'),
//       );

//       await expect(controller.create(createDto)).rejects.toThrow(
//         BadRequestException,
//       );
//     });

//     it('should propagate InternalServerErrorException from the service', async () => {
//       mockProductsService.create.mockRejectedValue(
//         new InternalServerErrorException('Failed to create product.'),
//       );

//       await expect(controller.create(createDto)).rejects.toThrow(
//         InternalServerErrorException,
//       );
//     });
//   });
// });
