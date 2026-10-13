// import { Test, TestingModule } from '@nestjs/testing';
// import { StockService } from './stock.service';
// import { DataSource } from 'typeorm';
// import { NotFoundException } from '@nestjs/common';

// export const mockDataSource = {
//   createQueryRunner: jest.fn(),
//   getRepository: jest.fn(),
//   connect: jest.fn(),
//   startTransaction: jest.fn(),
//   commitTransaction: jest.fn(),
//   rollbackTransaction: jest.fn(),
//   release: jest.fn(),
// };

// const mockQueryRunner = {
//   connect: jest.fn(),
//   startTransaction: jest.fn(),
//   manager: {
//     findOne: jest.fn().mockResolvedValue(null),
//   },
//   commitTransaction: jest.fn(),
//   rollbackTransaction: jest.fn(),
//   release: jest.fn(),
// };

// describe('StockService', () => {
//   let service: StockService;

//   beforeEach(async () => {
//     jest.resetAllMocks();
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         StockService,
//         { provide: DataSource, useValue: mockDataSource },
//       ],
//     }).compile();

//     service = module.get<StockService>(StockService);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   describe('adjustStock', () => {
//     it('should throw BadRequestException for non-positive quantity', async () => {
//       const dto = { product_id: '1', quantity: 0, type: 'INFLOW' };
//       await expect(service.adjustStock(dto)).rejects.toThrow(
//         'Mutation quantity must be greater than zero.',
//       );
//     });

//     it('should throw NotFoundException if product does not exist', async () => {
//       const dto = {
//         product_id: 'non-existent-id',
//         quantity: 1,
//         type: 'INFLOW',
//       };

//       mockDataSource.createQueryRunner.mockReturnValue({
//         connect: jest.fn(),
//         startTransaction: jest.fn(),
//         manager: {
//           findOne: jest.fn().mockResolvedValue(null), // Simulate product not found
//         },
//         commitTransaction: jest.fn(),
//         rollbackTransaction: jest.fn(),
//         release: jest.fn(),
//       });

//       await expect(service.adjustStock(dto)).rejects.toThrow(
//         'Product not found.',
//       );
//     });

//     it('should rollback the transaction when the product is not found', () => {
//       const dto = {
//         product_id: 'non-existent-id',
//         quantity: 1,
//         type: 'INFLOW',
//       };

//       mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

//       return expect(service.adjustStock(dto)).rejects.toThrow(
//         'Product not found.',
//       );
//     });

//     it('should release the query runner after a missing product', async () => {
//       const dto = {
//         product_id: 'non-existent-id',
//         quantity: 1,
//         type: 'INFLOW',
//       };

//       mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

//       await expect(service.adjustStock(dto)).rejects.toThrow(NotFoundException);

//       expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();

//       expect(mockQueryRunner.release).toHaveBeenCalled();
//     });

//     it('should throw error if stock');
//   });
// });
