import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BusinessesModule } from './resources/business/business.module';
import { StocksModule } from './resources/stocks/stock.module';
import { UsersModule } from './resources/users/users.module';
import { ProductsModule } from './resources/products/products.module';
import { PurchaseOrdersModule } from './resources/purchase_orders/purchase_orders.module';
import { SuppliersModule } from './resources/suppliers/suppliers.module';
import { ProductSourcesModule } from './resources/product_sources/product_sources.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLogsModule } from './resources/audit_logs/audit_logs.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './resources/dashboard/dashboard.module';
import { ReportsModule } from './resources/reports/reports.module';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database/config/getDatabaseConfig';
import { CategoriesModule } from './resources/categories/categories.module';
import { StoresModule } from './resources/stores/stores.module';
import { CloudinaryModule } from './common/utils/helpers/cloudinary/cloudinary.module';
import { StockMovementsModule } from './resources/stock_movements/stock_movements.module';

const filePath = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: filePath,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60, // Time-to-live window in seconds (e.g., 1 minute)
        limit: 10, // Maximum requests allowed per IP within the ttl window
      },
    ]),

    // ─── GLOBAL TYPEORM CONFIGURATION ───
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return getDatabaseConfig(configService);
      },
    }),
    ProductsModule,
    BusinessesModule,
    UsersModule,
    StocksModule,
    CloudinaryModule,
    PurchaseOrdersModule,
    ProductSourcesModule,
    SuppliersModule,
    ScheduleModule.forRoot(),
    AuditLogsModule,
    AuthModule,
    DashboardModule,
    ReportsModule,
    CategoriesModule,
    StoresModule,
    StockMovementsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Automatically applies the limiter guard to EVERY route
    },
  ],
})
export class AppModule {
  private readonly logger = new Logger('DatabaseCheck');

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      const driverType = this.dataSource.options.type;
      const dbName = this.dataSource.options.database;
      const registeredEntities = this.dataSource.entityMetadatas.length;

      const dbNameStr =
        dbName instanceof Uint8Array
          ? new TextDecoder().decode(dbName)
          : (dbName ?? 'None').toString();

      this.logger.log(`✅ Database Connected Successfully!`);
      this.logger.log(` Driver Type: ${driverType}`);
      this.logger.log(` Database:    ${dbNameStr}`);
      this.logger.log(` Entities:    ${registeredEntities} loaded`);
    } else {
      this.logger.error(`❌ Database Connection Failed to Initialize.`);
    }
  }
}
