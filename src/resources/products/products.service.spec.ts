// import { Test, TestingModule } from '@nestjs/testing';
// import { ProductsService } from './products.service';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import {
//   Product,
//   UomBaseName,
//   UomDisplayName,
//   UomType,
// } from './entities/product.entity';
// import { mockCloudinaryService } from '../business/business.service.spec';
// import { CloudinaryService } from '../../utils/helpers/cloudinary/cloudinary.service';
// import { DataSource } from 'typeorm';
// import {
//   MutationReason,
//   MutationType,
//   Stocks,
// } from '../stocks/entities/stock.entity';
// import { CreateProductDto } from './dto/create-product.dto';
// import { validate, ValidationError } from 'class-validator';
// import { plainToInstance } from 'class-transformer';

// const validateDto = async (
//   body: Partial<CreateProductDto>,
// ): Promise<ValidationError[]> => {
//   const dto = plainToInstance(CreateProductDto, body);
//   return validate(dto);
// };

// describe('ProductsService', () => {
//   let service: ProductsService;
//   const mockCreateProductDto = {
//     name: 'Test Product',
//     category: 'Test Category',
//     description: 'This is a test product',
//     selling_price: 100,
//     cost_price: 50,
//     stock_quantity: 10,
//     reorder_level: 5,
//     uom_type: UomType.UNIT,
//     uom_base_name: UomBaseName.PCS,
//     uom_display_name: UomDisplayName.PCS,
//   };

//   const mockProductRepository = {
//     create: jest.fn(),
//     findOne: jest.fn(),
//     update: jest.fn(),
//     remove: jest.fn(),
//     save: jest.fn(),
//   };

//   const mockQueryRunner = {
//     connect: jest.fn(),
//     startTransaction: jest.fn(),
//     commitTransaction: jest.fn(),
//     rollbackTransaction: jest.fn(),
//     release: jest.fn(),

//     manager: {
//       create: jest.fn(),
//       save: jest.fn(),
//       findOne: jest.fn(),
//       merge: jest.fn(),
//     },
//   };

//   const mockDataSource = {
//     createQueryRunner: jest.fn(),
//   };

//   beforeEach(async () => {
//     jest.resetAllMocks();
//     mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         ProductsService,
//         {
//           provide: getRepositoryToken(Product),
//           useValue: mockProductRepository,
//         },
//         {
//           provide: CloudinaryService,
//           useValue: mockCloudinaryService,
//         },
//         { provide: DataSource, useValue: mockDataSource },
//       ],
//     }).compile();

//     service = module.get<ProductsService>(ProductsService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   describe('create', () => {
//     const mockFiles = [
//       { fieldname: 'files', originalname: 'test.jpg' } as Express.Multer.File,
//     ];

//     it('should call the repository create method with the correct parameters', async () => {
//       const mockProduct = { id: 'uuid-1234', ...mockCreateProductDto };

//       mockQueryRunner.manager.create.mockReturnValue(mockProduct);
//       mockQueryRunner.manager.save
//         .mockReturnValueOnce(mockProduct)
//         .mockResolvedValueOnce({});

//       await service.create(mockCreateProductDto);

//       expect(mockQueryRunner.manager.create).toHaveBeenCalled();
//     });

//     it('should create a product with uploaded images and record a stock inflow ledger', async () => {
//       const mockImage = {
//         url: 'https://cloudinary.com/test.jpg',
//         publicId: 'products/test',
//       };

//       mockCloudinaryService.uploadProductImage.mockResolvedValue(mockImage);

//       const savedProd = {
//         id: 'new-prod-id',
//         ...mockCreateProductDto,
//         stock_quantity: 10000,
//       };

//       mockQueryRunner.manager.create
//         .mockReturnValueOnce(savedProd) // Product creation
//         .mockReturnValueOnce({}); // Stocks ledger creation

//       mockQueryRunner.manager.save
//         .mockResolvedValueOnce(savedProd) // Product saved
//         .mockResolvedValueOnce({}); // Stock ledger saved

//       const result = await service.create(mockCreateProductDto, mockFiles);

//       expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
//       expect(mockQueryRunner.connect).toHaveBeenCalled();
//       expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
//       expect(mockCloudinaryService.uploadProductImage).toHaveBeenCalledWith(
//         mockFiles[0],
//         'products',
//       );
//       expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
//         Product,
//         expect.objectContaining({
//           images: [mockImage],
//         }),
//       );
//       expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
//         Stocks,
//         expect.objectContaining({
//           product_id: 'new-prod-id',
//           type: MutationType.INFLOW,
//           reason: MutationReason.SUPPLIER_RESTOCK,
//         }),
//       );
//       expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
//       expect(mockQueryRunner.release).toHaveBeenCalled();
//       expect(result.data).toEqual(savedProd);
//     });

//     it('should create a product successfully with one image', async () => {
//       const mockImage = {
//         url: 'https://cloudinary.com/test.jpg',
//         publicId: 'products/test',
//       };

//       mockCloudinaryService.uploadProductImage.mockResolvedValue(mockImage);

//       const savedProd = {
//         id: 'new-prod-id',
//         ...mockCreateProductDto,
//         stock_quantity: 10000,
//       };

//       mockQueryRunner.manager.create
//         .mockReturnValueOnce(savedProd) // Product creation
//         .mockReturnValueOnce({}); // Stocks ledger creation

//       mockQueryRunner.manager.save
//         .mockResolvedValueOnce(savedProd) // Product saved
//         .mockResolvedValueOnce({}); // Stock ledger saved

//       const result = await service.create(mockCreateProductDto, mockFiles);

//       expect(result.data).toEqual(savedProd);
//     });

//     it('should upload multiple images and create a product successfully', async () => {
//       const mockImages = [
//         {
//           url: 'https://cloudinary.com/test1.jpg',
//           publicId: 'products/test1',
//         },
//         {
//           url: 'https://cloudinary.com/test2.jpg',
//           publicId: 'products/test2',
//         },
//       ];

//       mockCloudinaryService.uploadProductImage
//         .mockResolvedValueOnce(mockImages[0])
//         .mockResolvedValueOnce(mockImages[1]);

//       const savedProd = {
//         id: 'new-prod-id',
//         ...mockCreateProductDto,
//         stock_quantity: 10000,
//       };

//       mockQueryRunner.manager.create
//         .mockReturnValueOnce(savedProd) // Product creation
//         .mockReturnValueOnce({}); // Stocks ledger creation

//       mockQueryRunner.manager.save
//         .mockResolvedValueOnce(savedProd) // Product saved
//         .mockResolvedValueOnce({}); // Stock ledger saved

//       const result = await service.create(mockCreateProductDto, mockFiles);

//       expect(mockCloudinaryService.uploadProductImage).toHaveBeenCalledTimes(
//         mockFiles.length,
//       );
//       expect(result.data).toEqual(savedProd);
//     });

//     it('should convert stock quantity to base unit when creating a product with UOM type WEIGHT or VOLUME', async () => {
//       const mockCreateProductDtoWithWeight = {
//         ...mockCreateProductDto,
//         uom_type: UomType.WEIGHT,
//         uom_base_name: UomBaseName.G,
//         uom_display_name: UomDisplayName.KG,
//         stock_quantity: 1000, // 1000 grams
//       };

//       const savedProd = {
//         id: 'new-prod-id',
//         ...mockCreateProductDtoWithWeight,
//         stock_quantity: 1000, // Converted to base unit (1 kg)
//       };

//       mockQueryRunner.manager.create
//         .mockReturnValueOnce(savedProd)
//         .mockReturnValueOnce({});

//       mockQueryRunner.manager.save
//         .mockResolvedValueOnce(savedProd)
//         .mockResolvedValueOnce({});

//       const result = await service.create(mockCreateProductDtoWithWeight);

//       expect(result.data!.stock_quantity).toEqual(1000); // Check if converted to base unit (1 kg)
//     });

//     it('should validate UNIT with pcs', async () => {
//       const errors = await validateDto({
//         name: 'Pen',
//         selling_price: 100,
//         cost_price: 80,
//         stock_quantity: 50,
//         reorder_level: 5,
//         category: 'Stationery',

//         uom_type: UomType.UNIT,
//         uom_base_name: UomBaseName.PCS,
//         uom_display_name: UomDisplayName.PCS,
//       });

//       expect(errors).toHaveLength(0);
//     });

//     it('should validate WEIGHT using grams', async () => {
//       const errors = await validateDto({
//         name: 'Sugar',
//         selling_price: 100,
//         cost_price: 80,
//         stock_quantity: 50,
//         reorder_level: 5,
//         category: 'Food',

//         uom_type: UomType.WEIGHT,
//         uom_base_name: UomBaseName.G,
//         uom_display_name: UomDisplayName.G,
//       });

//       expect(errors).toHaveLength(0);
//     });

//     it('should validate WEIGHT using kilograms', async () => {
//       const errors = await validateDto({
//         name: 'Rice',

//         selling_price: 100,
//         cost_price: 80,
//         stock_quantity: 50,
//         reorder_level: 5,
//         category: 'Food',

//         uom_type: UomType.WEIGHT,
//         uom_base_name: UomBaseName.G,
//         uom_display_name: UomDisplayName.KG,
//       });

//       expect(errors).toHaveLength(0);
//     });

//     it('should fail when UNIT uses grams', async () => {
//       const errors = await validateDto({
//         name: 'Pen',

//         selling_price: 100,
//         cost_price: 80,
//         stock_quantity: 50,
//         reorder_level: 5,
//         category: 'Stationery',

//         uom_type: UomType.UNIT,
//         uom_base_name: UomBaseName.G,
//         uom_display_name: UomDisplayName.PCS,
//       });

//       expect(errors).not.toHaveLength(0);

//       expect(errors[0].constraints).toHaveProperty('isValidUom');
//     });

//     it('should fail when WEIGHT uses ml', async () => {
//       const errors = await validateDto({
//         name: 'Rice',

//         selling_price: 100,
//         cost_price: 80,
//         stock_quantity: 50,
//         reorder_level: 5,
//         category: 'Food',

//         uom_type: UomType.WEIGHT,
//         uom_base_name: UomBaseName.ML,
//         uom_display_name: UomDisplayName.KG,
//       });

//       expect(errors).not.toHaveLength(0);

//       expect(errors[0].constraints).toHaveProperty('isValidUom');
//     });

//     it('should fail when VOLUME uses kilograms', async () => {
//       const errors = await validateDto({
//         name: 'Milk',

//         selling_price: 100,
//         cost_price: 80,
//         stock_quantity: 50,
//         reorder_level: 5,
//         category: 'Drinks',

//         uom_type: UomType.VOLUME,
//         uom_base_name: UomBaseName.ML,
//         uom_display_name: UomDisplayName.KG,
//       });

//       expect(errors).not.toHaveLength(0);

//       expect(errors[0].constraints).toHaveProperty('isValidUom');
//     });

//     it('should fail for an invalid display unit', async () => {
//       const errors = await validateDto({
//         name: 'Milk',

//         selling_price: 100,
//         cost_price: 80,
//         stock_quantity: 50,
//         reorder_level: 5,
//         category: 'Drinks',

//         uom_type: UomType.VOLUME,
//         uom_base_name: UomBaseName.ML,
//         uom_display_name: 'BOX' as UomDisplayName,
//       });

//       expect(errors).not.toHaveLength(0);

//       expect(errors[0].constraints).toHaveProperty('isEnum');
//     });
//   });
// });
