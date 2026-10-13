// import { Test, TestingModule } from '@nestjs/testing';

// import { SuppliersController } from './suppliers.controller';
// import { SuppliersService } from './suppliers.service';

// describe('SuppliersController', () => {
//   let controller: SuppliersController;
//   let service: jest.Mocked<SuppliersService>;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [SuppliersController],
//       providers: [
//         {
//           provide: SuppliersService,
//           useValue: {
//             create: jest.fn(),
//             findAll: jest.fn(),
//             findOne: jest.fn(),
//             update: jest.fn(),
//             remove: jest.fn(),
//           },
//         },
//       ],
//     }).compile();

//     controller = module.get(SuppliersController);
//     service = module.get(SuppliersService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });

//   describe('create', () => {
//     it('should call create', async () => {
//       const dto = {
//         name: 'ABC Supplier',
//         email: 'abc@test.com',
//       };

//       service.create.mockResolvedValue({} as any);

//       await controller.create(dto);

//       expect(service.create).toHaveBeenCalledWith(dto);
//     });
//   });

//   describe('findAll', () => {
//     it('should call findAll', async () => {
//       service.findAll.mockResolvedValue([]);

//       await controller.findAll();

//       expect(service.findAll).toHaveBeenCalled();
//     });
//   });

//   describe('findOne', () => {
//     it('should call findOne', async () => {
//       service.findOne.mockResolvedValue({} as any);

//       await controller.findOne('supplier-id');

//       expect(service.findOne).toHaveBeenCalledWith('supplier-id');
//     });
//   });

//   describe('update', () => {
//     it('should call update', async () => {
//       const dto = {
//         name: 'Updated',
//       };

//       service.update.mockResolvedValue({} as any);

//       await controller.update('supplier-id', dto);

//       expect(service.update).toHaveBeenCalledWith('supplier-id', dto);
//     });
//   });

//   describe('remove', () => {
//     it('should call remove', async () => {
//       service.remove.mockResolvedValue(undefined);

//       await controller.remove('supplier-id');

//       expect(service.remove).toHaveBeenCalledWith('supplier-id');
//     });
//   });
// });
