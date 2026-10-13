// import { Test, TestingModule } from '@nestjs/testing';
// import { StockController } from './stock.controller';
// import { StockService } from './stock.service';

// describe('StockController', () => {
//   let controller: StockController;
//   const mockStockService = {
//     adjustStock: jest.fn(),
//     getLedger: jest.fn(),
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [StockController],
//       providers: [
//         StockController,
//         { provide: StockService, useValue: mockStockService },
//       ],
//     }).compile();

//     controller = module.get<StockController>(StockController);
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });
// });
