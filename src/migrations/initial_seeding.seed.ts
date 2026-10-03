import { MigrationInterface, QueryRunner } from 'typeorm';

import { passwordHasher } from '../common/utils/helpers/password_hasher';

import { seedGlobalPermissionsAndRoles } from '../database/seeders/permissions.seeder';
import { seedTenantUsers } from '../database/seeders/tenant.seeder';
import { seedCategoryAndSuppliers } from '../database/seeders/category.seeder';
import { seedGeneralAuditLogs } from '../database/seeders/audit_log.seeder';
import {
  BusinessBlueprint,
  currentScale,
  independentBusinessBlueprints,
  profileKey,
  seedBusinessTenant,
} from '../database/seeders/business.seeder';
import { seedPurchaseOrders } from '../database/seeders/purchase_order.seeder';
import { seedStoreStocksAndMovements } from '../database/seeders/stock.seeder';
import { seedStoresForBusiness } from '../database/seeders/store.seeder';
import { Store } from '../resources/stores/entities/store.entity';
import { AuditLog } from '../resources/audit_logs/entities/audit_log.entity';

/**
 * ============================================================
 * MULTITENANT BUSINESS & ROLE SIZING PROFILES
 * ============================================================
 */

export class InitialSeeding1785451531000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log(
      `🌍 Seeding Udua-kiet independent multitenant architecture using [${profileKey}] profile...`,
    );

    const modules = [
      'products',
      'categories',
      'suppliers',
      'stocks',
      'stock_movements',
      'purchase_orders',
      'users',
      'businesses',
      'audit_logs',
      'product_sources',
    ];

    // 1. Setup Global Roles & Permissions
    const roles = await seedGlobalPermissionsAndRoles(queryRunner, modules);

    // 2. Setup Default Password for Tenant Users
    const defaultPassword = await passwordHasher('Test@123!#');

    // 3. Loop Through Business Tenants
    for (let bIndex = 0; bIndex < currentScale.businessCount; bIndex++) {
      const bizBlueprintConfig: BusinessBlueprint =
        independentBusinessBlueprints[
          bIndex % independentBusinessBlueprints.length
        ];

      const businessId: string = await seedBusinessTenant(
        queryRunner,
        bizBlueprintConfig,
        bIndex,
        profileKey,
      );
      const storeSeedData: Store[] = await seedStoresForBusiness(
        queryRunner,
        businessId,
        bizBlueprintConfig,
        currentScale.storeCountPerBusiness,
      );
      const primaryStoreId: string = storeSeedData[0].id;

      const { supplierSeedData, productSeedData } =
        await seedCategoryAndSuppliers(
          queryRunner,
          businessId,
          bizBlueprintConfig,
          {
            categoryCount: currentScale.categoryCount,
            supplierCount: currentScale.supplierCount,
            productCount: currentScale.productCount,
          },
        );

      const tenantUsers = await seedTenantUsers(
        queryRunner,
        businessId,
        primaryStoreId,
        bizBlueprintConfig,
        roles,
        currentScale.usersPerBusiness,
        defaultPassword,
      );

      const tenantAdminUser = tenantUsers[0];
      const auditLogBatch: AuditLog[] = [];

      await seedPurchaseOrders(
        queryRunner,
        businessId,
        bizBlueprintConfig,
        storeSeedData,
        supplierSeedData,
        productSeedData,
        tenantUsers,
        tenantAdminUser,
        currentScale,
        auditLogBatch,
      );

      await seedStoreStocksAndMovements(
        queryRunner,
        businessId,
        currentScale,
        storeSeedData,
        productSeedData,
        tenantUsers,
      );

      await seedGeneralAuditLogs(
        queryRunner,
        businessId,
        tenantUsers,
        storeSeedData,
        auditLogBatch,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM audit_logs`);
    await queryRunner.query(`DELETE FROM stock_movements`);
    await queryRunner.query(`DELETE FROM stocks`);
    await queryRunner.query(`DELETE FROM purchase_order_items`);
    await queryRunner.query(`DELETE FROM purchase_orders`);
    await queryRunner.query(`DELETE FROM product_sources`);
    await queryRunner.query(`DELETE FROM user_auth`);
    await queryRunner.query(`DELETE FROM users`);
    await queryRunner.query(`DELETE FROM role_permissions`);
    await queryRunner.query(`DELETE FROM roles`);
    await queryRunner.query(`DELETE FROM permissions`);
    await queryRunner.query(`DELETE FROM suppliers`).catch(() => {});
    await queryRunner.query(`DELETE FROM categories`);
    await queryRunner.query(`DELETE FROM products`);
    await queryRunner.query(`DELETE FROM stores`);
    await queryRunner.query(`DELETE FROM businesses`);
  }
}
