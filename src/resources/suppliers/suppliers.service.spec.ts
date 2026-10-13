// import { Test, TestingModule } from '@nestjs/testing';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { NotFoundException } from '@nestjs/common';

// import { SuppliersService } from './suppliers.service';
// import { Supplier } from './entities/supplier.entity';

// describe('SuppliersService', () => {
//   let service: SuppliersService;
//   let repository: jest.Mocked<Repository<Supplier>>;

//   const supplier: Supplier = {
//     id: 'supplier-id',
//     name: 'ABC Supplier',
//     email: 'abc@test.com',
//     created_at: new Date(),
//     updated_at: new Date(),
//     productSources: [],
//     purchaseOrders: [],
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         SuppliersService,
//         {
//           provide: getRepositoryToken(Supplier),
//           useValue: {
//             create: jest.fn(),
//             save: jest.fn(),
//             find: jest.fn(),
//             findOne: jest.fn(),
//             remove: jest.fn(),
//           },
//         },
//       ],
//     }).compile();

//     service = module.get(SuppliersService);
//     repository = module.get(getRepositoryToken(Supplier));
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   describe('create', () => {
//     it('should create a supplier', async () => {
//       repository.create.mockReturnValue(supplier);
//       repository.save.mockResolvedValue(supplier);

//       const dto = {
//         name: 'ABC Supplier',
//         email: 'abc@test.com',
//       };

//       const result = await service.create(dto);

//       expect(repository.create).toHaveBeenCalledWith(dto);
//       expect(repository.save).toHaveBeenCalledWith(supplier);
//       expect(result).toEqual(supplier);
//     });
//   });

//   describe('findAll', () => {
//     it('should return all suppliers', async () => {
//       repository.find.mockResolvedValue([supplier]);

//       const result = await service.findAll();

//       expect(repository.find).toHaveBeenCalled();
//       expect(result).toEqual([supplier]);
//     });
//   });

//   describe('findOne', () => {
//     it('should return a supplier', async () => {
//       repository.findOne.mockResolvedValue(supplier);

//       const result = await service.findOne(supplier.id);

//       expect(result).toEqual(supplier);
//     });

//     it('should throw if supplier does not exist', async () => {
//       repository.findOne.mockResolvedValue(null);

//       await expect(service.findOne('bad-id')).rejects.toThrow(
//         NotFoundException,
//       );
//     });
//   });

//   describe('update', () => {
//     it('should update a supplier', async () => {
//       repository.findOne.mockResolvedValue(supplier);
//       repository.save.mockResolvedValue({
//         ...supplier,
//         name: 'Updated',
//       });

//       const result = await service.update(supplier.id, {
//         name: 'Updated',
//       });

//       expect(repository.save).toHaveBeenCalled();
//       expect(result.name).toBe('Updated');
//     });
//   });

//   describe('remove', () => {
//     it('should remove a supplier', async () => {
//       repository.findOne.mockResolvedValue(supplier);
//       repository.remove.mockResolvedValue(supplier);

//       await service.remove(supplier.id);

//       expect(repository.remove).toHaveBeenCalledWith(supplier);
//     });

//     it('should throw if supplier does not exist', async () => {
//       repository.findOne.mockResolvedValue(null);

//       await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
//     });
//   });
// });
