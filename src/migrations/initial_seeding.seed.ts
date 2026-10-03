import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { MigrationInterface, QueryRunner } from 'typeorm';

import { Role } from '../auth/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { UserAuth } from '../auth/entities/user_auth.entity';
import { User } from '../resources/users/entities/user.entity';

import { UserRole } from '../common/enum/user_role.enum';
import { passwordHasher } from '../common/utils/helpers/password_hasher';

import {
  Product,
  ProductStatus,
  UomBaseName,
  UomDisplayName,
  UomType,
} from '../resources/products/entities/product.entity';

import {
  StockMovementDirection,
  StockMovementType,
} from '../resources/stock_movements/entities/stock_movement.entity';
import { AuditLogAction, AuditLogEntity } from '../common/enum/audit_log.enum';
import { Store } from '../resources/stores/entities/store.entity';
import { Category } from '../resources/categories/entities/category.entity';
import { Supplier } from '../resources/suppliers/entities/supplier.entity';
import { PurchaseOrderStatus } from '../resources/purchase_orders/entities/purchase_order.entity';
import { AuditLog } from '../resources/audit_logs/entities/audit_log.entity';

/**
 * ============================================================
 * MULTITENANT BUSINESS & ROLE SIZING PROFILES
 * ============================================================
 */

const BUSINESS_SIZES = {
  SMALL: {
    businessCount: 2,
    storeCountPerBusiness: 1,
    categoryCount: 5,
    supplierCount: 5,
    productCount: 15,
    usersPerBusiness: 2,
  },
  MEDIUM: {
    businessCount: 3,
    storeCountPerBusiness: 2,
    categoryCount: 10,
    supplierCount: 12,
    productCount: 40,
    usersPerBusiness: 5,
  },
  LARGE: {
    businessCount: 5,
    storeCountPerBusiness: 4,
    categoryCount: 16,
    supplierCount: 25,
    productCount: 100,
    usersPerBusiness: 8,
  },
};

const BUSINESS_SIZE: keyof typeof BUSINESS_SIZES = 'MEDIUM'; // Options: SMALL, MEDIUM, LARGE

const profileKey = (BUSINESS_SIZE?.toUpperCase() ||
  'MEDIUM') as keyof typeof BUSINESS_SIZES;
const currentScale = BUSINESS_SIZES[profileKey] || BUSINESS_SIZES.MEDIUM;

interface PermissionDefinition {
  name: string;
  description: string;
}

interface RoleDefinition {
  name: UserRole;
  description: string;
}

interface BusinessBlueprint {
  name: string;
  prefix: string;
  city: string;
  state: string;
}
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

    // Repositories
    const userRepository = queryRunner.manager.getRepository(User);
    const userAuthRepository = queryRunner.manager.getRepository(UserAuth);
    const permissionRepository = queryRunner.manager.getRepository(Permission);
    const roleRepository = queryRunner.manager.getRepository(Role);

    /**
     * ============================================================
     * 1. PERMISSIONS & GLOBAL ROLES SETUP
     * ============================================================
     */

    const actions = ['create', 'read', 'update', 'delete'];

    // Permission Definitions
    const permissionDefinitions: PermissionDefinition[] = modules.flatMap(
      (module) =>
        actions.map((action) => ({
          name: `${module}.${action}`,
          description: `${action} ${module}`,
        })),
    );

    permissionDefinitions.push(
      {
        name: 'purchase_orders.approve',
        description: 'Approve purchase orders',
      },
      { name: 'stocks.adjust', description: 'Adjust stock quantities' },
    );

    const permissions: Permission[] = [];
    for (const definition of permissionDefinitions) {
      const permission = permissionRepository.create(definition);
      permissions.push(await permissionRepository.save(permission));
    }

    const roleDefinitions: RoleDefinition[] = [
      {
        name: UserRole.SUPER_ADMIN,
        description: 'System or Platform Administrator',
      },
      {
        name: UserRole.ADMIN,
        description: 'Business Owner or General Manager',
      },
      { name: UserRole.MANAGER, description: 'Branch or Store Manager' },
      { name: UserRole.STOREMAN, description: 'Warehouse / Inventory Handler' },
      { name: UserRole.CASHIER, description: 'Sales Point Operator' },
    ];

    const roles: Role[] = [];
    for (const definition of roleDefinitions) {
      const role = roleRepository.create(definition);
      roles.push(await roleRepository.save(role));
    }

    const superAdminRole = roles.find(
      (role) => role.name === UserRole.SUPER_ADMIN,
    )!;
    const adminRole = roles.find((role) => role.name === UserRole.ADMIN)!;
    const managerRole = roles.find((role) => role.name === UserRole.MANAGER)!;
    const storemanRole = roles.find((role) => role.name === UserRole.STOREMAN)!;
    const cashierRole = roles.find((role) => role.name === UserRole.CASHIER)!;

    // Assign all permissions to SUPER_ADMIN
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into('role_permissions')
      .values(
        permissions.map((p) => ({
          role_id: superAdminRole.id,
          permission_id: p.id,
        })),
      )
      .execute();

    // Assign operational permissions to ADMIN
    const adminPermissions = permissions.filter(
      (p) => !p.name.startsWith('businesses.'),
    );
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into('role_permissions')
      .values(
        adminPermissions.map((p) => ({
          role_id: adminRole.id,
          permission_id: p.id,
        })),
      )
      .execute();

    /**
     * ============================================================
     * 2. LOOP THROUGH COMPLETELY INDEPENDENT BUSINESS TENANTS
     * ============================================================
     */
    const independentBusinessBlueprints: BusinessBlueprint[] = [
      {
        name: 'Ekenedilichukwu Supermarkets Ltd',
        prefix: 'EKS',
        city: 'Onitsha',
        state: 'Anambra',
      },
      {
        name: 'Calabar Fresh Foods & Provision',
        prefix: 'CFF',
        city: 'Calabar',
        state: 'Cross River',
      },
      {
        name: 'Oodua Hardware & General Stores',
        prefix: 'OHS',
        city: 'Ibadan',
        state: 'Oyo',
      },
      {
        name: 'Sahel Agro-Allied Ventures',
        prefix: 'SAV',
        city: 'Kano',
        state: 'Kano',
      },
      {
        name: 'Atlantic Maritime Supply Co',
        prefix: 'AMS',
        city: 'Lagos',
        state: 'Lagos',
      },
    ];

    const defaultPassword = await passwordHasher('Test@123!#');

    for (let bIndex = 0; bIndex < currentScale.businessCount; bIndex++) {
      const bizBlueprint: BusinessBlueprint =
        independentBusinessBlueprints[
          bIndex % independentBusinessBlueprints.length
        ];
      const businessId = randomUUID();

      // Create isolated business tenant
      await queryRunner.query(
        `
          INSERT INTO businesses (
            id, legal_name, display_name, registration_number, tax_identification_number,
            business_type, email, phone_number, website, address_line_1, city, state, country,
            postal_code, currency, timezone, locale, settings
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          businessId,
          bizBlueprint.name,
          bizBlueprint.name,
          `RC-887766-${bIndex + 1}`,
          `TIN-112233-${bIndex + 1}`,
          'RETAIL',
          `admin@${bizBlueprint.prefix.toLowerCase()}store.ng`,
          faker.phone.number({ style: 'international' }),
          `https://${bizBlueprint.prefix.toLowerCase()}store.ng`,
          faker.location.streetAddress(),
          bizBlueprint.city,
          bizBlueprint.state,
          'NG',
          '100001',
          'NGN',
          'Africa/Lagos',
          'en-NG',
          JSON.stringify({
            tier: profileKey,
            tenantIndex: bIndex + 1,
            currencySymbol: '₦',
          }),
        ],
      );

      // Create isolated stores belonging *only* to this business tenant
      const storeSeedData: Partial<Store>[] = [];
      for (let s = 0; s < currentScale.storeCountPerBusiness; s++) {
        const storeId = randomUUID();
        storeSeedData.push({
          id: storeId,
          name: `${bizBlueprint.prefix} Outlet ${s + 1}`,
          code: `${bizBlueprint.prefix}-STR-${s + 1}`,
          address: faker.location.streetAddress(),
          city: bizBlueprint.city,
          state: bizBlueprint.state,
          country: 'NG',
          phone_number: faker.phone.number({ style: 'international' }),
          business_id: businessId,
        });
      }

      for (const store of storeSeedData) {
        await queryRunner.query(
          `
            INSERT INTO stores (id, business_id, name, code, address, city, state, country, phone_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            store.id,
            businessId,
            store.name,
            store.code,
            store.address,
            store.city,
            store.state,
            store.country,
            store.phone_number,
          ],
        );
      }
      const primaryStoreId = storeSeedData[0].id;

      // Create isolated product categories for this business tenant
      const categorySeedData: Partial<Category>[] = [];
      for (let c = 0; c < currentScale.categoryCount; c++) {
        categorySeedData.push({
          id: randomUUID(),
          name: `${bizBlueprint.prefix} Cat ${c + 1}`,
          description: faker.commerce.productDescription(),
        });
      }

      for (const cat of categorySeedData) {
        await queryRunner.query(
          `INSERT INTO categories (id, business_id, name, description) VALUES (?, ?, ?, ?)`,
          [cat.id, businessId, cat.name, cat.description],
        );
      }

      // Create isolated suppliers for this business tenant
      const supplierSeedData: Partial<Supplier>[] = [];
      for (let sup = 0; sup < currentScale.supplierCount; sup++) {
        supplierSeedData.push({
          id: randomUUID(),
          name: `${faker.company.name()} (${bizBlueprint.prefix})`,
          phone_number: faker.phone.number({ style: 'international' }),
          email: faker.internet.email(),
        });
      }

      for (const sup of supplierSeedData) {
        await queryRunner.query(
          `INSERT INTO suppliers (id, name, phone_number, email, business_id) VALUES (?, ?, ?, ?, ?)`,
          [sup.id, sup.name, sup.phone_number, sup.email, businessId],
        );
      }

      // Create isolated products for this business tenant
      const productSeedData: Partial<Product>[] = [];
      for (let p = 0; p < currentScale.productCount; p++) {
        const costPrice = faker.number.float({
          min: 200,
          max: 50000,
          fractionDigits: 2,
        });
        const sellingPrice = Number((costPrice * 1.25).toFixed(2));
        const category = faker.helpers.arrayElement(categorySeedData);

        productSeedData.push({
          id: randomUUID(),
          business_id: businessId,
          category_id: category.id,
          name: `${bizBlueprint.prefix} Item ${p + 1}`,
          description: faker.commerce.productDescription(),
          images: [],
          cost_price: costPrice,
          selling_price: sellingPrice,
          uom_type: UomType.UNIT,
          uom_base_name: UomBaseName.PCS,
          uom_display_name: UomDisplayName.PCS,
          status: ProductStatus.ACTIVE,
          default_reorder_point: 10,
        });
      }

      for (const prod of productSeedData) {
        await queryRunner.query(
          `
            INSERT INTO products (
              id, name, description, images, cost_price, selling_price,
              uom_type, uom_base_name, uom_display_name, status, category_id, business_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            prod.id,
            prod.name,
            prod.description,
            JSON.stringify(prod.images),
            prod.cost_price,
            prod.selling_price,
            prod.uom_type,
            prod.uom_base_name,
            prod.uom_display_name,
            prod.status,
            prod.category_id,
            prod.business_id,
          ],
        );
      }

      /**
       * ============================================================
       * 3. PROVISION USERS & ROLES SPECIFIC TO THIS BUSINESS TENANT
       * ============================================================
       */
      const userRolesToAssign = [
        {
          role: superAdminRole,
          emailPrefix: 'superadmin',
          first: 'Etiene',
          last: 'Essenoh',
        },
        {
          role: adminRole,
          emailPrefix: 'admin',
          first: 'Chinedu',
          last: 'Okafor',
        },
        {
          role: managerRole,
          emailPrefix: 'manager',
          first: 'Amina',
          last: 'Bello',
        },
        {
          role: storemanRole,
          emailPrefix: 'storeman',
          first: 'Emeka',
          last: 'Nwosu',
        },
        {
          role: cashierRole,
          emailPrefix: 'cashier',
          first: 'Folake',
          last: 'Adeyemi',
        },
      ];

      const assignedRoleList = userRolesToAssign.slice(
        0,
        currentScale.usersPerBusiness,
      );
      const tenantUsers: { id: string; email: string }[] = [];

      for (const uConfig of assignedRoleList) {
        const userEmail = `${uConfig.emailPrefix}.${bizBlueprint.prefix.toLowerCase()}@uduakiet.com`;

        const createdUser = userRepository.create({
          business_id: businessId,
          store_id: primaryStoreId,
          first_name: uConfig.first,
          last_name: `${uConfig.last} (${bizBlueprint.prefix})`,
          company_email: userEmail,
          role_id: uConfig.role.id,
        });

        const savedUser = await userRepository.save(createdUser);

        await userAuthRepository.save(
          userAuthRepository.create({
            user_id: savedUser.id,
            password: defaultPassword,
            is_email_verified: true,
          }),
        );

        tenantUsers.push({ id: savedUser.id, email: userEmail });
      }

      const tenantAdminUser = tenantUsers[0];

      /**
       * ============================================================
       * 4. SEED `product_sources` (Supplier-Product Mappings)
       * ============================================================
       */
      for (const prod of productSeedData) {
        const supplier = faker.helpers.arrayElement(supplierSeedData);

        await queryRunner.query(
          `
            INSERT INTO product_sources (
              id, business_id, product_id, supplier_id
            )
            VALUES (?, ?, ?, ?)
          `,
          [randomUUID(), businessId, prod.id, supplier.id],
        );
      }

      /**
       * ============================================================
       * 5. SEED `purchase_orders`, `purchase_order_items`, & SCALED `stock_movements`
       * ============================================================
       */
      const poStatuses: PurchaseOrderStatus[] = [
        PurchaseOrderStatus.PENDING,
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.RECEIVED,
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.CANCELLED,
      ];

      const poCountPerBusiness = Math.max(
        3,
        currentScale.storeCountPerBusiness * 4,
      );
      const auditLogBatch: Partial<AuditLog>[] = [];

      for (let i = 0; i < poCountPerBusiness; i++) {
        const poId = randomUUID();
        const poNumber = `PO-${bizBlueprint.prefix}-2026-${String(i + 1).padStart(3, '0')}`;
        const supplier = faker.helpers.arrayElement(supplierSeedData);
        const status = faker.helpers.arrayElement(poStatuses);
        const store = faker.helpers.arrayElement(storeSeedData);
        const actingUser = faker.helpers.arrayElement(tenantUsers);

        // Pick 3-5 random products for this purchase order
        const poProducts = faker.helpers.arrayElements(
          productSeedData,
          faker.number.int({ min: 3, max: 5 }),
        );
        let totalEstimatedCost = 0;

        const poItemsData = poProducts.map((prod) => {
          const qtyOrdered = faker.number.int({ min: 10, max: 100 });
          const qtyReceived =
            status === PurchaseOrderStatus.RECEIVED
              ? qtyOrdered
              : status === PurchaseOrderStatus.APPROVED
                ? Math.floor(qtyOrdered * 0.5)
                : 0;
          const unitCost = prod.cost_price ?? 0;
          const totalCost = Number((qtyOrdered * unitCost).toFixed(2));
          totalEstimatedCost += totalCost;

          return {
            id: randomUUID(),
            product_id: prod.id,
            quantity_requested: qtyOrdered,
            quantity_received: qtyReceived,
            estimated_unit_cost: unitCost,
            total_cost: totalCost,
          };
        });

        // Insert Purchase Order Header
        await queryRunner.query(
          `
            INSERT INTO purchase_orders (
              id, po_number, store_id, supplier_id, business_id, status, total_estimated_cost, created_by_id, approved_by_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            poId,
            poNumber,
            store.id,
            supplier.id,
            businessId,
            status,
            Number(totalEstimatedCost).toFixed(2),
            actingUser.id,
            status === PurchaseOrderStatus.APPROVED ||
            status === PurchaseOrderStatus.RECEIVED
              ? tenantAdminUser.id
              : null,
          ],
        );

        // Insert Purchase Order Line Items
        for (const item of poItemsData) {
          await queryRunner.query(
            `
              INSERT INTO purchase_order_items (
                id, purchase_order_id, product_id, quantity_requested, estimated_unit_cost, total_cost
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              item.id,
              poId,
              item.product_id,
              item.quantity_requested,
              item.estimated_unit_cost,
              item.total_cost,
            ],
          );
        }

        // Collect audit log for PO creation
        auditLogBatch.push({
          id: randomUUID(),
          business_id: businessId,
          store_id: store.id,
          user_id: actingUser.id,
          action: AuditLogAction.CREATE,
          entity: AuditLogEntity.PURCHASE_ORDER,
          entity_id: poId,
          old_value: null,
          new_value: { poNumber, status, totalEstimatedCost },
          metadata: {
            ip: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            reason: `Generated purchase order ${poNumber} with status ${status}`,
          },
        });
      }

      // Seed realistic store-specific assortments, stock levels, and high-volume stock movements
      for (const store of storeSeedData) {
        const storeAssortmentSize = faker.number.int({
          min: Math.floor(productSeedData.length * 0.75),
          max: productSeedData.length,
        });
        const storeProducts = faker.helpers.arrayElements(
          productSeedData,
          storeAssortmentSize,
        );

        for (const prod of storeProducts) {
          const stockId = randomUUID();
          const isOutOfStock = faker.datatype.boolean({ probability: 0.05 });
          const initialQty = isOutOfStock
            ? 0
            : faker.number.int({ min: 20, max: 250 });

          // 1. Insert Stock Record
          await queryRunner.query(
            `INSERT INTO stocks (id, business_id, store_id, product_id, current_quantity) VALUES (?, ?, ?, ?, ?)`,
            [stockId, businessId, store.id, prod.id, initialQty],
          );

          if (initialQty > 0) {
            // 2. Initial Opening Stock Movement
            await queryRunner.query(
              `
                INSERT INTO stock_movements (
                  id, business_id, stock_id, quantity, quantity_before, quantity_after, direction, type, unit_cost_price, unit_selling_price, reason, created_by_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                randomUUID(),
                businessId,
                stockId,
                initialQty,
                0,
                initialQty,
                StockMovementDirection.IN,
                StockMovementType.INITIAL_STOCK,
                prod.cost_price,
                prod.selling_price,
                'Initial opening stock balance seeding',
                tenantAdminUser.id,
              ],
            );

            // 3. Scaled Operational Movements (Sales, Adjustments, Restocks)
            const operationalEventsCount = faker.number.int({ min: 2, max: 6 });
            let runningQty = initialQty;

            for (let e = 0; e < operationalEventsCount; e++) {
              const isSale = faker.datatype.boolean({ probability: 0.7 });
              const movementQty = isSale
                ? faker.number.int({ min: 1, max: Math.min(5, runningQty) })
                : faker.number.int({ min: 2, max: 15 });

              const direction = isSale
                ? StockMovementDirection.OUT
                : StockMovementDirection.IN;
              const movementType = isSale
                ? StockMovementType.SALE
                : StockMovementType.ADJUSTMENT;

              const qtyBefore = runningQty;
              const qtyAfter = isSale
                ? qtyBefore - movementQty
                : qtyBefore + movementQty;
              runningQty = qtyAfter;

              const storemanOrCashier = faker.helpers.arrayElement(tenantUsers);

              await queryRunner.query(
                `
                  INSERT INTO stock_movements (
                    id, business_id, stock_id, quantity, quantity_before, quantity_after, direction, type, unit_cost_price, unit_selling_price, reason, created_by_id
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                  randomUUID(),
                  businessId,
                  stockId,
                  movementQty,
                  qtyBefore,
                  qtyAfter,
                  direction,
                  movementType,
                  prod.cost_price,
                  prod.selling_price,
                  isSale
                    ? 'Point of sale transaction'
                    : 'Periodic physical stock audit correction',
                  storemanOrCashier.id,
                ],
              );
            }
          }
        }
      }

      /**
       * ============================================================
       * 6. BULK SEED AUDIT LOGS FOR THIS BUSINESS TENANT
       * ============================================================
       */
      for (let a = 0; a < 15; a++) {
        const randomUser = faker.helpers.arrayElement(tenantUsers);
        const randomStore = faker.helpers.arrayElement(storeSeedData);
        const actionsList = [
          {
            action: AuditLogAction.CREATE,
            entity: AuditLogEntity.PRODUCT,
            desc: 'Added new catalog item',
          },
          {
            action: AuditLogAction.UPDATE,
            entity: AuditLogEntity.STOCK,
            desc: 'Updated stock safety thresholds',
          },
          {
            action: AuditLogAction.CREATE,
            entity: AuditLogEntity.SUPPLIER,
            desc: 'Onboarded secondary supplier',
          },
          {
            action: AuditLogAction.UPDATE,
            entity: AuditLogEntity.USER,
            desc: 'Modified staff access roles',
          },
        ];
        const chosen = faker.helpers.arrayElement(actionsList);

        auditLogBatch.push({
          id: randomUUID(),
          business_id: businessId,
          store_id: randomStore.id,
          user_id: randomUser.id,
          action: chosen.action,
          entity: chosen.entity,
          entity_id: randomUUID(),
          old_value: null,
          new_value: { message: chosen.desc },
          metadata: {
            ip: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            reason: chosen.desc,
          },
        });
      }

      // Execute bulk insert for audit logs
      for (const log of auditLogBatch) {
        await queryRunner.query(
          `
            INSERT INTO audit_logs (
              id, business_id, store_id, user_id, action, entity, entity_id, old_value, new_value, metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            log.id,
            log.business_id,
            log.store_id,
            log.user_id,
            log.action,
            log.entity,
            log.entity_id,
            log.old_value ? JSON.stringify(log.old_value) : null,
            log.new_value ? JSON.stringify(log.new_value) : null,
            log.metadata ? JSON.stringify(log.metadata) : null,
          ],
        );
      }
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
