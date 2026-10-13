// import { Test, TestingModule } from '@nestjs/testing';
// import { CompaniesController } from './business.controller';
// import { CompaniesService } from './business.service';
// import { CreateCompanyDto } from './dto/create-business.dto';
// import { UpdateCompanyDto } from './dto/update-business.dto';
// import {
//   NotFoundException,
//   BadRequestException,
//   ValidationPipe,
//   ArgumentMetadata,
//   ParseUUIDPipe,
// } from '@nestjs/common';

// describe('CompaniesController', () => {
//   let controller: CompaniesController;
//   let validationPipe: ValidationPipe;
//   let uuidPipe: ParseUUIDPipe;

//   // 1. Mock CompaniesService
//   const mockCompaniesService = {
//     create: jest.fn(),
//     findOne: jest.fn(),
//     update: jest.fn(),
//     remove: jest.fn(),
//   };

//   // 2. Helper to generate dummy Multer files
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
//     stream: null,
//   });

//   const createDto: CreateCompanyDto = {
//     name: 'SwiftBuy Ltd',
//     email: 'info@swiftbuy.com',
//     currency: 'NGN',
//     logo: {
//       url: 'data:image/png;base64,mock-image-data',
//       publicId: 'mock-public-id',
//     },
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [CompaniesController],
//       providers: [
//         {
//           provide: CompaniesService,
//           useValue: mockCompaniesService,
//         },
//       ],
//     }).compile();

//     controller = module.get<CompaniesController>(CompaniesController);

//     // Instantiate validation boundaries locally for security testing
//     validationPipe = new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     });
//     uuidPipe = new ParseUUIDPipe();

//     jest.clearAllMocks(); // Prevent assertion leaks between tests
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });

//   // =========================================================================
//   // CORE CONTROLLER TESTS (CRUD & File Handling)
//   // =========================================================================
//   describe('Core Controller Actions', () => {
//     describe('POST /companies (create)', () => {
//       it('should create a company without a logo file', async () => {
//         const mockResult = { id: 'uuid-1234', ...createDto, logo: null };
//         mockCompaniesService.create.mockResolvedValue(mockResult);

//         const result = await controller.create(createDto, undefined);

//         expect(mockCompaniesService.create).toHaveBeenCalledWith(
//           createDto,
//           undefined,
//         );
//         expect(result).toEqual(mockResult);
//       });

//       it('should create a company with a logo file', async () => {
//         const mockFile = createMockFile();
//         const mockResult = {
//           id: 'uuid-1234',
//           ...createDto,
//           logo: 'https://cdn.com/logo.png',
//         };

//         mockCompaniesService.create.mockResolvedValue(mockResult);

//         const result = await controller.create(createDto, mockFile);

//         expect(mockCompaniesService.create).toHaveBeenCalledWith(
//           createDto,
//           mockFile,
//         );
//         expect(result).toEqual(mockResult);
//       });

//       it('should propagate service exceptions safely', async () => {
//         mockCompaniesService.create.mockRejectedValue(
//           new BadRequestException(
//             `Workspace name '${createDto.name}' or email '${createDto.email}' is taken.`,
//           ),
//         );

//         await expect(controller.create(createDto, undefined)).rejects.toThrow(
//           BadRequestException,
//         );
//       });
//     });

//     describe('GET /companies/:id (findOne)', () => {
//       const companyId = '75d8628b-b72d-45bf-a627-ef627cb2818f';

//       it('should return a single company when a valid UUID is passed', async () => {
//         const mockResult = { id: companyId, name: 'SwiftBuy Ltd' };
//         mockCompaniesService.findOne.mockResolvedValue(mockResult);

//         const result = await controller.findOne(companyId);

//         expect(mockCompaniesService.findOne).toHaveBeenCalledWith(companyId);
//         expect(result).toEqual(mockResult);
//       });

//       it('should propagate NotFoundException if company is missing', async () => {
//         mockCompaniesService.findOne.mockRejectedValue(
//           new NotFoundException('Company not found'),
//         );

//         await expect(controller.findOne(companyId)).rejects.toThrow(
//           NotFoundException,
//         );
//       });
//     });

//     describe('PATCH /companies/:id (update)', () => {
//       const companyId = '75d8628b-b72d-45bf-a627-ef627cb2818f';
//       const updateDto: UpdateCompanyDto = { name: 'SwiftBuy International' };

//       it('should update textual data without modifying the logo', async () => {
//         const mockResult = {
//           id: companyId,
//           name: 'SwiftBuy International',
//           logo: 'old-logo-url',
//         };
//         mockCompaniesService.update.mockResolvedValue(mockResult);

//         const result = await controller.update(companyId, updateDto, undefined);

//         expect(mockCompaniesService.update).toHaveBeenCalledWith(
//           companyId,
//           updateDto,
//           undefined,
//         );
//         expect(result).toEqual(mockResult);
//       });

//       it('should update company data alongside a new logo file', async () => {
//         const mockFile = createMockFile();
//         const mockResult = {
//           id: companyId,
//           name: 'SwiftBuy International',
//           logo: 'new-logo-url',
//         };
//         mockCompaniesService.update.mockResolvedValue(mockResult);

//         const result = await controller.update(companyId, updateDto, mockFile);

//         expect(mockCompaniesService.update).toHaveBeenCalledWith(
//           companyId,
//           updateDto,
//           mockFile,
//         );
//         expect(result).toEqual(mockResult);
//       });
//     });

//     describe('DELETE /companies/:id (remove)', () => {
//       const companyId = '75d8628b-b72d-45bf-a627-ef627cb2818f';

//       it('should call remove with the correct company ID', async () => {
//         mockCompaniesService.remove.mockResolvedValue({ deleted: true });

//         const result = await controller.remove(companyId);

//         expect(mockCompaniesService.remove).toHaveBeenCalledWith(companyId);
//         expect(result).toEqual({ deleted: true });
//       });
//     });
//   });

//   // =========================================================================
//   // SECURITY & VALIDATION UNIT TESTS
//   // =========================================================================
//   describe('Security & Input Validation Safeguards', () => {
//     // Testing Route Parameter Validation (ParseUUIDPipe) [cite: 95]
//     describe('URL Parameter Security (UUID Validation)', () => {
//       const metadata: ArgumentMetadata = {
//         type: 'param',
//         metatype: String,
//         data: 'id',
//       };

//       it('should block SQL Injection vectors sent inside route parameters', async () => {
//         const sqlInjectionPayload =
//           "75d8628b-b72d-45bf-a627-ef627cb2818f' OR 1=1; DROP TABLE companies;--";

//         await expect(
//           uuidPipe.transform(sqlInjectionPayload, metadata),
//         ).rejects.toThrow(BadRequestException); // Instantly terminates before service layer [cite: 96]
//       });

//       it('should allow clean, properly formatted standard UUIDs', async () => {
//         const cleanUuid = '75d8628b-b72d-45bf-a627-ef627cb2818f';
//         const result = await uuidPipe.transform(cleanUuid, metadata);
//         expect(result).toBe(cleanUuid);
//       });
//     });

//     // Testing Payload Sanitization & Anti-Mass Assignment (ValidationPipe) [cite: 92]
//     describe('Request Body Security (DTO Validation)', () => {
//       const metadata: ArgumentMetadata = {
//         type: 'body',
//         metatype: CreateCompanyDto,
//       };

//       it('should reject non-whitelisted database properties (anti-mass assignment)', async () => {
//         const payloadWithInjectedProperties = {
//           name: 'Secure Company Ltd',
//           email: 'secure@company.com',
//           currency: 'USD',
//           // Malicious injections attempting to alter privileges or IDs directly
//           isAdmin: true,
//           role: 'superuser',
//           id: '1',
//         };

//         await expect(
//           validationPipe.transform(payloadWithInjectedProperties, metadata),
//         ).rejects.toThrow(BadRequestException); // Whitelist rules filter / reject this [cite: 94]
//       });

//       it('should reject validation bypass/SQLi strings in strict-format fields (e.g. Email)', async () => {
//         const payloadWithMaliciousEmail = {
//           name: 'Secure Company Ltd',
//           email: "' OR '1'='1 --", // SQL injection payload injected into email [cite: 92]
//           currency: 'USD',
//         };

//         await expect(
//           validationPipe.transform(payloadWithMaliciousEmail, metadata),
//         ).rejects.toThrow(BadRequestException); // Blocks invalid formats natively [cite: 93]
//       });

//       it('should succeed validation with standard, well-formed DTO payloads', async () => {
//         const securePayload = {
//           name: 'Secure Company Ltd',
//           email: 'secure@company.com',
//           currency: 'USD',
//         };

//         const result = (await validationPipe.transform(
//           securePayload,
//           metadata,
//         )) as CreateCompanyDto;
//         expect(result).toEqual(securePayload);
//       });
//     });
//   });
// });
