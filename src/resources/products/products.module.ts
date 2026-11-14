import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { CloudinaryService } from '../../common/utils/helpers/cloudinary/cloudinary.service';
import { Stock } from '../stocks/entities/stock.entity';
import { StockMovement } from '../stock_movements/entities/stock_movement.entity';
import { AuditLogsModule } from '../../observability/logging/audit_logs/audit_logs.module';
import { RequestContextService } from '../../observability/context/request_content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Stock, StockMovement]),
    AuditLogsModule,
  ],
  providers: [ProductsService, CloudinaryService, RequestContextService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
