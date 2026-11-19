import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

import { Product } from '../products/entities/product.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { StockMovement } from '../stock_movements/entities/stock_movement.entity';
import { PurchaseOrder } from '../purchase_orders/entities/purchase_order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Stock, StockMovement, PurchaseOrder]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
