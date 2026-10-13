// import { Test, TestingModule } from '@nestjs/testing';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import { CompaniesService } from './business.service';
// import { Company } from './entities/business.entity';
// import { CreateCompanyDto } from './dto/create-business.dto';
// import { NotFoundException } from '@nestjs/common';
// import { CloudinaryService } from '../../utils/helpers/cloudinary/cloudinary.service';

// export const mockCloudinaryService = {
//   uploadProductImage: jest.fn().mockResolvedValue({
//     url: 'https://cdn.com/logo.png',
//     publicId: 'public-id-123',
//   }),
//   deleteImage: jest.fn().mockResolvedValue(true),
// };

// describe('CompaniesService', () => {
//   let service: CompaniesService;

//   // Define strict mock repository implementations for TypeORM methods
//   const mockCompanyRepository = {
//     create: jest.fn(),
//     save: jest.fn(),
//     findOne: jest.fn(),
//     update: jest.fn(), // Needed for update operations in TypeORM
//     remove: jest.fn(),
//     merge: jest.fn(),
//     softDelete: jest.fn(), // Added for soft delete operations
//   };

//   // Helper to generate a dummy Multer logo file
//   const createMockFile = (): Express.Multer.File => ({
//     fieldname: 'logo',
//     originalname: 'logo.png',
//     encoding: '7bit',
//     mimetype: 'image/png',
//     buffer: Buffer.from('mock-image-data'),
//     size: 1024,
//     destination: '',
//     filename: '',
//     path: '',
//     stream: null as any,
//   });

//   beforeEach(async () => {
//     jest.resetAllMocks();
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         CompaniesService,
//         {
//           provide: getRepositoryToken(Company),
//           useValue: mockCompanyRepository,
//         },
//         {
//           provide: CloudinaryService,
//           useValue: mockCloudinaryService,
//         },
//       ],
//     }).compile();

//     service = module.get<CompaniesService>(CompaniesService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   // =========================================================================
//   // CREATE
//   // =========================================================================
//   describe('create', () => {
//     const createDto: CreateCompanyDto = {
//       name: 'SwiftBuy Inc',
//       email: 'hello@swiftbuy.com',
//       currency: 'NGN',
//     };

//     it('should successfully create a new company without a logo file', async () => {
//       const rawCompanyEntity = {
//         id: 'uuid-123',
//         ...createDto,
//         logo: null,
//         phone_number: undefined,
//         settings: {},
//       };

//       // Ensure our findOne check passes (assuming your service checks if company exists)
//       mockCompanyRepository.findOne.mockResolvedValue(null);
//       mockCompanyRepository.create.mockReturnValue(rawCompanyEntity);
//       mockCompanyRepository.save.mockResolvedValue(rawCompanyEntity);

//       const result = await service.create(createDto, undefined);

//       // 1. Verify repository calls
//       expect(mockCompanyRepository.create).toHaveBeenCalledWith({
//         ...createDto,
//         logo: null,
//         phone_number: undefined,
//         settings: {},
//       });
//       expect(mockCompanyRepository.save).toHaveBeenCalledWith(rawCompanyEntity);

//       // 2. Verify wrapped ApiResponse output
//       expect(result).toEqual({
//         status: true,
//         message: 'Company registered successfully',
//         data: rawCompanyEntity,
//       });
//     });

//     it('should handle company creation containing a logo file', async () => {
//       const mockFile = createMockFile();
//       const rawCompanyWithLogo = {
//         id: 'uuid-123',
//         ...createDto,
//         logo: 'https://cdn.com/logo.png', // Or whatever your Cloudinary mock returns
//         phone_number: undefined,
//         settings: {},
//       };

//       // Mock service dependencies
//       mockCompanyRepository.findOne.mockResolvedValue(null);
//       mockCompanyRepository.create.mockReturnValue(rawCompanyWithLogo);
//       mockCompanyRepository.save.mockResolvedValue(rawCompanyWithLogo);
//       mockCloudinaryService.uploadProductImage.mockResolvedValue({
//         url: 'https://cdn.com/logo.png',
//         publicId: 'public-id-123',
//       });

//       const result = await service.create(createDto, mockFile);

//       // 1. Verify repository / media uploads
//       expect(mockCloudinaryService.uploadProductImage).toHaveBeenCalledWith(
//         mockFile,
//         'branding',
//       );
//       expect(mockCompanyRepository.create).toHaveBeenCalledWith({
//         ...createDto,
//         logo: {
//           publicId: 'public-id-123',
//           url: 'https://cdn.com/logo.png',
//         },
//         phone_number: undefined,
//         settings: {},
//       });
//       expect(mockCompanyRepository.save).toHaveBeenCalledWith(
//         rawCompanyWithLogo,
//       );

//       // 2. Verify wrapped ApiResponse output matches structure
//       expect(result).toEqual({
//         status: true,
//         message: 'Company registered successfully',
//         data: rawCompanyWithLogo,
//       });
//     });
//   });

//   // =========================================================================
//   // FIND ONE
//   // =========================================================================
//   describe('findOne', () => {
//     const companyId = '75d8628b-b72d-45bf-a627-ef627cb2818f';

//     it('should return a company if found', async () => {
//       const expectedCompany = {
//         id: companyId,
//         name: 'SwiftBuy Inc',
//         email: 'hello@swiftbuy.com',
//       };

//       mockCompanyRepository.findOne.mockResolvedValue(expectedCompany); //

//       const result = await service.findOne(companyId);

//       expect(mockCompanyRepository.findOne).toHaveBeenCalledWith({
//         where: { id: companyId },
//       });
//       expect(result).toEqual({
//         status: true,
//         message: 'Company profile retrieved',
//         data: expectedCompany,
//       });
//     });

//     it('should throw a NotFoundException if company does not exist', async () => {
//       mockCompanyRepository.findOne.mockResolvedValue(null);

//       await expect(service.findOne(companyId)).rejects.toThrow(
//         new NotFoundException('Company profile not found.'), // Adjust message to match your service
//       );
//     });
//   });

//   // =========================================================================
//   // UPDATE
//   // =========================================================================

//   describe('update', () => {
//     const companyId = '75d8628b-b72d-45bf-a627-ef627cb2818f';
//     const updateDto = { name: 'SwiftBuy Holdings' };

//     const mockFile = {
//       fieldname: 'file',
//       originalname: 'logo.png',
//       encoding: '7bit',
//       mimetype: 'image/png',
//       buffer: Buffer.from('mock buffer'),
//       size: 1024,
//     } as Express.Multer.File;

//     beforeEach(() => {
//       jest.clearAllMocks();
//     });

//     it('should successfully update text fields and replace an existing logo', async () => {
//       const existingCompany = {
//         id: companyId,
//         name: 'SwiftBuy Inc',
//         logo: {
//           url: 'old-url.com',
//           publicId: 'old-public-id',
//         },
//       };

//       const newUploadedAsset = {
//         url: 'new-url.com',
//         publicId: 'new-public-id',
//       };

//       const expectedSavedCompany = {
//         ...existingCompany,
//         ...updateDto,
//         logo: newUploadedAsset,
//       };

//       mockCompanyRepository.findOne.mockResolvedValue(existingCompany);

//       mockCompanyRepository.create.mockReturnValue({
//         ...existingCompany,
//       });

//       mockCloudinaryService.uploadProductImage.mockResolvedValue(
//         newUploadedAsset,
//       );

//       mockCompanyRepository.save.mockResolvedValue(expectedSavedCompany);

//       mockCloudinaryService.deleteImage.mockResolvedValue(true);

//       const result = await service.update(companyId, updateDto, mockFile);

//       const uploadOrder =
//         mockCloudinaryService.uploadProductImage.mock.invocationCallOrder[0];

//       const saveOrder = mockCompanyRepository.save.mock.invocationCallOrder[0];

//       const deleteOrder =
//         mockCloudinaryService.deleteImage.mock.invocationCallOrder[0];

//       expect(uploadOrder).toBeLessThan(saveOrder);
//       expect(saveOrder).toBeLessThan(deleteOrder);

//       expect(mockCompanyRepository.findOne).toHaveBeenCalledWith({
//         where: { id: companyId },
//       });

//       expect(mockCloudinaryService.uploadProductImage).toHaveBeenCalledWith(
//         mockFile,
//         'branding',
//       );

//       expect(mockCompanyRepository.merge).toHaveBeenCalled();

//       expect(mockCompanyRepository.save).toHaveBeenCalled();

//       expect(mockCloudinaryService.deleteImage).toHaveBeenCalledWith(
//         'old-public-id',
//       );

//       expect(result).toEqual({
//         status: true,
//         message: 'Company profile updated successfully',
//         data: expectedSavedCompany,
//       });
//     });

//     it('should successfully upload a logo even if the company had no logo initially', async () => {
//       const existingCompany = {
//         id: companyId,
//         name: 'SwiftBuy Inc',
//         logo: null,
//       };

//       const uploadedAsset = {
//         url: 'new-url.com',
//         publicId: 'new-public-id',
//       };

//       const expectedSavedCompany = {
//         ...existingCompany,
//         ...updateDto,
//         logo: uploadedAsset,
//       };

//       mockCompanyRepository.findOne.mockResolvedValue(existingCompany);

//       mockCompanyRepository.create.mockReturnValue({
//         ...existingCompany,
//       });

//       mockCloudinaryService.uploadProductImage.mockResolvedValue(uploadedAsset);

//       mockCompanyRepository.save.mockResolvedValue(expectedSavedCompany);

//       const result = await service.update(companyId, updateDto, mockFile);

//       expect(mockCompanyRepository.findOne).toHaveBeenCalledWith({
//         where: { id: companyId },
//       });

//       expect(mockCloudinaryService.uploadProductImage).toHaveBeenCalledWith(
//         mockFile,
//         'branding',
//       );

//       expect(mockCompanyRepository.merge).toHaveBeenCalled();

//       expect(mockCompanyRepository.save).toHaveBeenCalled();

//       // No previous logo, so nothing should be deleted.
//       expect(mockCloudinaryService.deleteImage).not.toHaveBeenCalled();

//       expect(result).toEqual({
//         status: true,
//         message: 'Company profile updated successfully',
//         data: expectedSavedCompany,
//       });
//     });

//     it('should complete the update even if the old logo cleanup fails after a successful database save', async () => {
//       const existingCompany = {
//         id: companyId,
//         name: 'SwiftBuy Inc',
//         logo: {
//           url: 'old-url.com',
//           publicId: 'old-public-id',
//         },
//       };

//       const uploadedAsset = {
//         url: 'new-url.com',
//         publicId: 'new-public-id',
//       };

//       const expectedSavedCompany = {
//         ...existingCompany,
//         ...updateDto,
//         logo: uploadedAsset,
//       };

//       mockCompanyRepository.findOne.mockResolvedValue(existingCompany);

//       mockCompanyRepository.create.mockReturnValue({
//         ...existingCompany,
//       });

//       mockCloudinaryService.uploadProductImage.mockResolvedValue(uploadedAsset);

//       mockCompanyRepository.save.mockResolvedValue(expectedSavedCompany);

//       // Simulate Cloudinary cleanup failure
//       mockCloudinaryService.deleteImage.mockRejectedValue(
//         new Error('Cloudinary delete failed'),
//       );

//       const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

//       const result = await service.update(companyId, updateDto, mockFile);

//       expect(mockCompanyRepository.findOne).toHaveBeenCalledWith({
//         where: { id: companyId },
//       });

//       expect(mockCloudinaryService.uploadProductImage).toHaveBeenCalledWith(
//         mockFile,
//         'branding',
//       );

//       expect(mockCompanyRepository.save).toHaveBeenCalled();

//       expect(mockCloudinaryService.deleteImage).toHaveBeenCalledWith(
//         'old-public-id',
//       );

//       expect(loggerWarnSpy).toHaveBeenCalledWith(
//         expect.stringContaining(
//           'Failed to delete previous logo (old-public-id)',
//         ),
//       );

//       // Update still succeeds
//       expect(result).toEqual({
//         status: true,
//         message: 'Company profile updated successfully',
//         data: expectedSavedCompany,
//       });
//     });

//     it('should throw NotFoundException if the company does not exist', async () => {
//       mockCompanyRepository.findOne.mockResolvedValue(null);

//       await expect(
//         service.update(companyId, updateDto, undefined),
//       ).rejects.toThrow(new NotFoundException('Company not found.'));
//     });
//   });

//   // =========================================================================
//   // REMOVE
//   // =========================================================================
//   describe('remove', () => {
//     const companyId = '75d8628b-b72d-45bf-a627-ef627cb2818f';

//     it('should locate and successfully remove an existing company', async () => {
//       const existingCompany = { id: companyId, name: 'SwiftBuy Inc' };

//       mockCompanyRepository.findOne.mockResolvedValue(existingCompany);
//       mockCompanyRepository.softDelete.mockResolvedValue(existingCompany);

//       const result = await service.remove(companyId);

//       expect(mockCompanyRepository.findOne).toHaveBeenCalledWith({
//         where: { id: companyId },
//       });
//       expect(mockCompanyRepository.softDelete).toHaveBeenCalledWith({
//         id: companyId,
//       });
//       expect(result).toEqual({
//         status: true,
//         message: 'Company configuration completely purged',
//         data: null,
//       });
//     });

//     it('should throw a NotFoundException during deletion if company is missing', async () => {
//       mockCompanyRepository.findOne.mockResolvedValue(null);

//       await expect(service.remove(companyId)).rejects.toThrow(
//         NotFoundException,
//       );
//       expect(mockCompanyRepository.softDelete).not.toHaveBeenCalled();
//     });
//   });
// });
