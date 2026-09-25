import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { MigrationInterface, QueryRunner } from 'typeorm';

import { Role } from '../auth/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { UserAuth } from '../auth/entities/user_auth.entity';
import { User } from '../resources/users/entities/user.entity';

import { UserRole } from '../common/enum/user_role.enum';

import { passwordHasher } from '../common/utils/helpers/password_hasher';
import { BusinessIdRow } from '../auth/interfaces/index.interface';

import {
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

export class InitialSeeding1785451531000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * ============================================================
     * 1. BUSINESS
     * ============================================================
     */

    const businessId = randomUUID();

    await queryRunner.query(
      `
        INSERT INTO businesses (
          id,
          legal_name,
          display_name,
          registration_number,
          tax_identification_number,
          business_type,
          email,
          phone_number,
          website,
          address_line_1,
          address_line_2,
          city,
          state,
          country,
          postal_code,
          currency,
          timezone,
          locale,
          settings
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        businessId,
        'Udua-kiet Technologies Ltd',
        'Udua-kiet Inventory',
        'RC-1234567',
        'TIN-98765432',
        'RETAIL',
        'admin@uduakiet.com',
        '+2348012345678',
        'https://uduakiet.ng',
        'Plot 123, Ozumba Mbadiwe Avenue',
        'Victoria Island',
        'Lagos',
        'Lagos',
        'NG',
        '101241',
        'NGN',
        'Africa/Lagos',
        'en-NG',
        JSON.stringify({
          themeColor: '#06b6d4',
          enableNotifications: true,
          enableMultiBranch: true,
          lowStockThreshold: 10,
          enableReceiptQR: true,
          receiptFooterText:
            'Thank you for shopping at UduaKiet! One Market, Unlimited Possibilities.',
          defaultTaxRate: 7.5,
        }),
      ],
    );

    /**
     * ============================================================
     * 2. STORES
     * ============================================================
     */

    const mainStoreId = randomUUID();

    const storeSeedData = [
      {
        id: mainStoreId,
        name: 'Main Store - Victoria Island',
        code: 'MAIN-VI',
        address: 'Plot 123, Ozumba Mbadiwe Avenue',
        city: 'Lagos',
        state: 'Lagos',
        country: 'NG',
        phone_number: '+2348012345678',
      },
      {
        id: randomUUID(),
        name: 'Ikeja Mall Branch',
        code: 'STR-IKJ',
        address: 'Obafemi Awolowo Way, Ikeja',
        city: 'Ikeja',
        state: 'Lagos',
        country: 'NG',
        phone_number: '+2348087654321',
      },
      {
        id: randomUUID(),
        name: 'Central Warehouse - Abuja',
        code: 'WH-ABJ',
        address: 'Plot 45, Industrial Zone, Idu',
        city: 'Abuja',
        state: 'FCT',
        country: 'NG',
        phone_number: '+2348099887766',
      },
    ];

    for (const store of storeSeedData) {
      await queryRunner.query(
        `
          INSERT INTO stores (
            id,
            business_id,
            name,
            code,
            address,
            city,
            state,
            country,
            phone_number
          )
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

    /**
     * ============================================================
     * 3. CATEGORIES
     * ============================================================
     */

    const categorySeedData = [
      {
        id: randomUUID(),
        name: 'Beverages & Drinks',
        description: 'Coffee beans, bottled water, tea, and soft beverages',
      },
      {
        id: randomUUID(),
        name: 'POS Hardware & Devices',
        description:
          'Barcode scanners, receipt printers, and terminal accessories',
      },
      {
        id: randomUUID(),
        name: 'Packaging & Supplies',
        description: 'Thermal paper rolls, shopping bags, and packing boxes',
      },
      {
        id: randomUUID(),
        name: 'Cleaning & Sanitation',
        description: 'Surface sanitizers, detergents, and hygiene essentials',
      },
      {
        id: randomUUID(),
        name: 'Office & Admin Accessories',
        description: 'Stationery, desk mounts, and administrative supplies',
      },
    ];

    for (const category of categorySeedData) {
      await queryRunner.query(
        `
          INSERT INTO categories (
            id,
            business_id,
            name,
            description
          )
          VALUES (?, ?, ?, ?)
        `,
        [category.id, businessId, category.name, category.description],
      );
    }

    /**
     * ============================================================
     * 4. SUPPLIERS
     * ============================================================
     */

    const supplierSeedData = [
      {
        id: randomUUID(),
        name: 'Global Freight & Logistics Ltd',
        email: 'orders@globalfreight.com',
      },
      {
        id: randomUUID(),
        name: 'Acme Component Distributors',
        email: 'supply@acmedist.com',
      },
      {
        id: randomUUID(),
        name: 'Lagos Trade Supplies Ltd',
        email: 'sales@lagostrade.com',
      },
      {
        id: randomUUID(),
        name: 'Prime Office Solutions',
        email: 'orders@primeoffice.ng',
      },
      {
        id: randomUUID(),
        name: 'CleanPro Nigeria Ltd',
        email: 'supplies@cleanpro.ng',
      },
    ];

    for (const supplier of supplierSeedData) {
      await queryRunner.query(
        `
          INSERT INTO suppliers (
            id,
            name,
            email,
            business_id
          )
          VALUES (?, ?, ?, ?)
        `,
        [supplier.id, supplier.name, supplier.email, businessId],
      );
    }

    /**
     * ============================================================
     * 5. PRODUCTS
     * ============================================================
     *
     * Product contains product/master information only.
     *
     * IMPORTANT:
     * Product does NOT contain stock_quantity.
     *
     * Inventory quantity belongs to the Stock entity.
     */

    const productDefinitions = [
      {
        name: 'Premium Arabica Coffee Beans',
        categoryIndex: 0,
        uom_type: UomType.WEIGHT,
        uom_base_name: UomBaseName.G,
        uom_display_name: UomDisplayName.KG,
      },
      {
        name: 'Bottled Spring Water 75cl',
        categoryIndex: 0,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Green Tea Pack',
        categoryIndex: 0,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Barcode Scanner',
        categoryIndex: 1,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Thermal Receipt Printer',
        categoryIndex: 1,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'USB Cash Drawer',
        categoryIndex: 1,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Thermal Paper Roll',
        categoryIndex: 2,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Medium Shopping Bag',
        categoryIndex: 2,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Packing Carton',
        categoryIndex: 2,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Surface Disinfectant',
        categoryIndex: 3,
        uom_type: UomType.VOLUME,
        uom_base_name: UomBaseName.ML,
        uom_display_name: UomDisplayName.L,
      },
      {
        name: 'Liquid Detergent',
        categoryIndex: 3,
        uom_type: UomType.VOLUME,
        uom_base_name: UomBaseName.ML,
        uom_display_name: UomDisplayName.L,
      },
      {
        name: 'Hand Sanitizer',
        categoryIndex: 3,
        uom_type: UomType.VOLUME,
        uom_base_name: UomBaseName.ML,
        uom_display_name: UomDisplayName.ML,
      },
      {
        name: 'A4 Copy Paper',
        categoryIndex: 4,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Ballpoint Pen Pack',
        categoryIndex: 4,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
      {
        name: 'Desktop Calculator',
        categoryIndex: 4,
        uom_type: UomType.UNIT,
        uom_base_name: UomBaseName.PCS,
        uom_display_name: UomDisplayName.PCS,
      },
    ];

    const productSeedData = productDefinitions.map((product) => {
      const costPrice = faker.number.float({
        min: 500,
        max: 100000,
        fractionDigits: 2,
      });

      const default_reorder_point = faker.number.int({ min: 10, max: 10000 });

      const markup = faker.number.float({
        min: 1.15,
        max: 1.45,
        fractionDigits: 2,
      });

      const sellingPrice = Number((costPrice * markup).toFixed(2));

      return {
        id: randomUUID(),
        business_id: businessId,
        category_id: categorySeedData[product.categoryIndex].id,

        name: product.name,
        description: faker.commerce.productDescription(),
        images: JSON.stringify([]),

        cost_price: costPrice,
        selling_price: sellingPrice,

        uom_type: product.uom_type,
        uom_base_name: product.uom_base_name,
        uom_display_name: product.uom_display_name,

        status: ProductStatus.ACTIVE,

        default_reorder_point,
      };
    });

    for (const product of productSeedData) {
      await queryRunner.query(
        `
          INSERT INTO products (
            id,
            name,
            description,
            images,
            cost_price,
            selling_price,
            uom_type,
            uom_base_name,
            uom_display_name,
            status,
            category_id,
            business_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          product.id,
          product.name,
          product.description,
          product.images,
          product.cost_price,
          product.selling_price,
          product.uom_type,
          product.uom_base_name,
          product.uom_display_name,
          product.status,
          product.category_id,
          product.business_id,
        ],
      );
    }

    /**
     * ============================================================
     * 6. STOCK BALANCES
     * ============================================================
     *
     * Stock is the CURRENT inventory balance.
     *
     * It is:
     *
     *   Product + Store = Stock
     *
     * The product itself does not own quantity.
     */

    const stockSeedData = productSeedData.map((product) => {
      let current_quantity: number;

      switch (product.uom_base_name) {
        case UomBaseName.G:
          /**
           * Base UOM = grams.
           *
           * 1kg = 1000g.
           */
          current_quantity = faker.number.int({
            min: 5000,
            max: 150000,
          });

          break;

        case UomBaseName.ML:
          /**
           * Base UOM = millilitres.
           *
           * 1L = 1000ml.
           */
          current_quantity = faker.number.int({
            min: 5000,
            max: 150000,
          });

          break;

        case UomBaseName.PCS:
        default:
          current_quantity = faker.number.int({
            min: 5,
            max: 150,
          });

          break;
      }

      return {
        id: randomUUID(),
        business_id: businessId,
        store_id: mainStoreId,
        product_id: product.id,
        current_quantity,
      };
    });

    for (const stock of stockSeedData) {
      await queryRunner.query(
        `
          INSERT INTO stocks (
            id,
            business_id,
            store_id,
            product_id,
            current_quantity
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          stock.id,
          stock.business_id,
          stock.store_id,
          stock.product_id,
          stock.current_quantity,
        ],
      );
    }

    /**
     * ============================================================
     * 7. PERMISSIONS
     * ============================================================
     */

    const permissionRepository = queryRunner.manager.getRepository(Permission);

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
    ];

    const actions = ['create', 'read', 'update', 'delete'];

    const permissionDefinitions = modules.flatMap((module) =>
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
      {
        name: 'stocks.adjust',
        description: 'Adjust stock quantities',
      },
    );

    const permissions: Permission[] = [];

    for (const definition of permissionDefinitions) {
      const permission = permissionRepository.create(definition);

      permissions.push(await permissionRepository.save(permission));
    }

    /**
     * ============================================================
     * 8. ROLES
     * ============================================================
     */

    const roleRepository = queryRunner.manager.getRepository(Role);

    const roleDefinitions = [
      {
        name: UserRole.SUPER_ADMIN,
        description: 'System administrator',
      },
      {
        name: UserRole.ADMIN,
        description: 'Business owner or administrator',
      },
      {
        name: UserRole.MANAGER,
        description: 'Store or warehouse manager',
      },
      {
        name: UserRole.STOREMAN,
        description: 'Store operator',
      },
      {
        name: UserRole.CASHIER,
        description: 'Sales cashier',
      },
    ];

    const roles: Role[] = [];

    for (const definition of roleDefinitions) {
      const role = roleRepository.create(definition);

      roles.push(await roleRepository.save(role));
    }

    /**
     * ============================================================
     * 9. SUPER ADMIN ROLE PERMISSIONS
     * ============================================================
     */

    const superAdminRole = roles.find(
      (role) => role.name === UserRole.SUPER_ADMIN,
    );

    if (!superAdminRole) {
      throw new Error('SUPER_ADMIN role was not created');
    }

    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into('role_permissions')
      .values(
        permissions.map((permission) => ({
          role_id: superAdminRole.id,
          permission_id: permission.id,
        })),
      )
      .execute();

    /**
     * ============================================================
     * 10. FIRST USER
     * ============================================================
     */

    const userRepository = queryRunner.manager.getRepository(User);

    const superAdminUser = userRepository.create({
      business_id: businessId,
      store_id: mainStoreId,
      first_name: 'Etiene',
      last_name: 'Essenoh',
      company_email: 'superadmin@uduakiet.com',
      role_id: superAdminRole.id,
    });

    const savedAdmin = await userRepository.save(superAdminUser);

    /**
     * ============================================================
     * 11. USER AUTHENTICATION
     * ============================================================
     */

    const userAuthRepository = queryRunner.manager.getRepository(UserAuth);

    const password = await passwordHasher('Test@123!#');

    const userAuth = userAuthRepository.create({
      user_id: savedAdmin.id,
      password,
      is_email_verified: true,
    });

    await userAuthRepository.save(userAuth);

    /**
     * ============================================================
     * 12. INITIAL STOCK MOVEMENTS
     * ============================================================
     *
     * Each Stock balance gets one immutable opening
     * StockMovement.
     *
     * IMPORTANT:
     *
     * StockMovement.quantity is ALWAYS positive.
     *
     * direction = IN
     *
     * quantity_before = 0
     *
     * quantity_after = current opening balance
     *
     * There is intentionally no reference_type here because
     * INITIAL_STOCK is not a valid StockMovementReferenceType.
     */

    const stockMovementSeedData = stockSeedData.map((stock) => {
      const product = productSeedData.find(
        (product) => product.id === stock.product_id,
      );

      if (!product) {
        throw new Error(
          `Product "${stock.product_id}" could not be found for stock movement seed.`,
        );
      }

      return {
        id: randomUUID(),

        business_id: stock.business_id,
        stock_id: stock.id,
        created_by_id: savedAdmin.id,

        type: StockMovementType.RECEIPT,
        direction: StockMovementDirection.IN,

        quantity: stock.current_quantity,
        quantity_before: 0,
        quantity_after: stock.current_quantity,

        unit_cost_price: product.cost_price,
        unit_selling_price: product.selling_price,

        reason: 'Initial inventory setup',
      };
    });

    for (const movement of stockMovementSeedData) {
      await queryRunner.query(
        `
          INSERT INTO stock_movements (
            id,
            business_id,
            stock_id,
            created_by_id,
            type,
            direction,
            quantity,
            quantity_before,
            quantity_after,
            unit_cost_price,
            unit_selling_price,
            reason,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [
          movement.id,
          movement.business_id,
          movement.stock_id,
          movement.created_by_id,
          movement.type,
          movement.direction,
          movement.quantity,
          movement.quantity_before,
          movement.quantity_after,
          movement.unit_cost_price,
          movement.unit_selling_price,
          movement.reason,
        ],
      );
    }

    /**
     * ============================================================
     * 13. AUDIT LOGS
     * ============================================================
     */

    const auditLogs = [
      /**
       * Business creation
       */
      {
        id: randomUUID(),
        action: AuditLogAction.CREATE,
        user_id: savedAdmin.id,
        entity: AuditLogEntity.BUSINESS,
        entity_id: businessId,
        old_value: null,
        new_value: {
          legal_name: 'Uduakiet Technologies Ltd',
          display_name: 'Uduakiet Inventory',
          business_type: 'RETAIL',
          currency: 'NGN',
          timezone: 'Africa/Lagos',
          locale: 'en-NG',
        },
        metadata: {
          source: 'initial_seed',
        },
        business_id: businessId,
        store_id: null,
      },

      /**
       * Store creation
       */
      ...storeSeedData.map((store) => ({
        id: randomUUID(),
        action: AuditLogAction.CREATE,
        user_id: savedAdmin.id,
        entity: AuditLogEntity.STORE,
        entity_id: store.id,
        old_value: null,
        new_value: {
          name: store.name,
          code: store.code,
          city: store.city,
          state: store.state,
          country: store.country,
        },
        metadata: {
          source: 'initial_seed',
        },
        business_id: businessId,
        store_id: store.id,
      })),

      /**
       * Product creation
       *
       * Notice:
       * No stock quantity is recorded here because Product
       * no longer owns inventory.
       */
      ...productSeedData.map((product) => ({
        id: randomUUID(),
        action: AuditLogAction.CREATE,
        user_id: savedAdmin.id,
        entity: AuditLogEntity.PRODUCT,
        entity_id: product.id,
        old_value: null,
        new_value: {
          name: product.name,
          category_id: product.category_id,
          cost_price: product.cost_price,
          selling_price: product.selling_price,
          uom_type: product.uom_type,
          uom_base_name: product.uom_base_name,
          uom_display_name: product.uom_display_name,
          status: product.status,
        },
        metadata: {
          source: 'initial_seed',
        },
        business_id: businessId,
        store_id: null,
      })),

      /**
       * Stock creation
       */
      ...stockSeedData.map((stock) => ({
        id: randomUUID(),
        action: AuditLogAction.CREATE,
        user_id: savedAdmin.id,
        entity: AuditLogEntity.STOCK,
        entity_id: stock.id,
        old_value: {
          quantity: 0,
        },
        new_value: {
          quantity: stock.current_quantity,
          product_id: stock.product_id,
          store_id: stock.store_id,
        },
        metadata: {
          source: 'initial_seed',
          reason: 'Initial inventory setup',
        },
        business_id: businessId,
        store_id: stock.store_id,
      })),

      /**
       * Stock movement creation
       */
      ...stockMovementSeedData.map((movement) => ({
        id: randomUUID(),
        action: AuditLogAction.CREATE,
        user_id: savedAdmin.id,
        entity: AuditLogEntity.STOCK_MOVEMENT,
        entity_id: movement.id,

        old_value: {
          quantity: movement.quantity_before,
        },

        new_value: {
          quantity: movement.quantity_after,
          type: movement.type,
          direction: movement.direction,
          stock_id: movement.stock_id,
        },

        metadata: {
          source: 'initial_seed',
          reason: movement.reason,
        },

        business_id: movement.business_id,

        store_id:
          stockSeedData.find((stock) => stock.id === movement.stock_id)
            ?.store_id ?? null,
      })),

      /**
       * Super admin creation
       */
      {
        id: randomUUID(),
        action: AuditLogAction.CREATE,
        user_id: savedAdmin.id,
        entity: AuditLogEntity.USER,
        entity_id: savedAdmin.id,
        old_value: null,
        new_value: {
          first_name: savedAdmin.first_name,
          last_name: savedAdmin.last_name,
          company_email: savedAdmin.company_email,
          role_id: savedAdmin.role_id,
          store_id: savedAdmin.store_id,
        },
        metadata: {
          source: 'initial_seed',
          role: UserRole.SUPER_ADMIN,
          email_verified: true,
        },
        business_id: businessId,
        store_id: mainStoreId,
      },
    ];

    for (const auditLog of auditLogs) {
      await queryRunner.query(
        `
          INSERT INTO audit_logs (
            id,
            action,
            user_id,
            entity,
            entity_id,
            old_value,
            new_value,
            metadata,
            business_id,
            store_id,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [
          auditLog.id,
          auditLog.action,
          auditLog.user_id,
          auditLog.entity,
          auditLog.entity_id,
          auditLog.old_value ? JSON.stringify(auditLog.old_value) : null,
          auditLog.new_value ? JSON.stringify(auditLog.new_value) : null,
          auditLog.metadata ? JSON.stringify(auditLog.metadata) : null,
          auditLog.business_id,
          auditLog.store_id,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * ============================================================
     * FIND SEEDED BUSINESS
     * ============================================================
     */

    const result: unknown = await queryRunner.query(
      `
          SELECT
            b.id
          FROM businesses b
          INNER JOIN users u
            ON u.business_id = b.id
          WHERE u.company_email = ?
          LIMIT 1
        `,
      ['superadmin@uduakiet.com'],
    );

    const businesses = result as BusinessIdRow[];

    if (businesses.length === 0) {
      return;
    }

    const businessId = businesses[0].id;

    /**
     * ============================================================
     * DELETE AUDIT LOGS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM audit_logs
        WHERE business_id = ?
      `,
      [businessId],
    );

    /**
     * ============================================================
     * DELETE STOCK MOVEMENTS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM stock_movements
        WHERE business_id = ?
      `,
      [businessId],
    );

    /**
     * ============================================================
     * DELETE STOCK RECORDS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM stocks
        WHERE business_id = ?
      `,
      [businessId],
    );

    /**
     * ============================================================
     * DELETE USER AUTHENTICATION
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE ua
        FROM user_auth ua
        INNER JOIN users u
          ON u.id = ua.user_id
        WHERE u.business_id = ?
      `,
      [businessId],
    );

    /**
     * ============================================================
     * DELETE USERS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM users
        WHERE business_id = ?
      `,
      [businessId],
    );

    /**
     * ============================================================
     * DELETE ROLE PERMISSIONS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE rp
        FROM role_permissions rp
        INNER JOIN roles r
          ON r.id = rp.role_id
        WHERE r.name IN (
          'SUPER_ADMIN',
          'ADMIN',
          'MANAGER',
          'STOREMAN',
          'CASHIER'
        )
      `,
    );

    /**
     * ============================================================
     * DELETE ROLES
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM roles
        WHERE name IN (
          'SUPER_ADMIN',
          'ADMIN',
          'MANAGER',
          'STOREMAN',
          'CASHIER'
        )
      `,
    );

    /**
     * ============================================================
     * DELETE PERMISSIONS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM permissions
        WHERE name LIKE 'products.%'
           OR name LIKE 'categories.%'
           OR name LIKE 'suppliers.%'
           OR name LIKE 'stocks.%'
           OR name LIKE 'stock_movements.%'
           OR name LIKE 'purchase_orders.%'
           OR name LIKE 'users.%'
           OR name LIKE 'businesses.%'
           OR name LIKE 'audit_logs.%'
           OR name = 'purchase_orders.approve'
           OR name = 'stocks.adjust'
      `,
    );

    /**
     * ============================================================
     * DELETE SUPPLIERS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM suppliers
      `,
    );

    /**
     * ============================================================
     * DELETE CATEGORIES
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM categories
        WHERE business_id = ?
      `,
      [businessId],
    );

    /**
     * ============================================================
     * DELETE PRODUCTS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM products
        WHERE business_id = ?
      `,
      [businessId],
    );

    /**
     * ============================================================
     * DELETE STORES
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM stores
        WHERE business_id = ?
      `,
      [businessId],
    );

    /**
     * ============================================================
     * DELETE BUSINESS
     * ============================================================
     */

    await queryRunner.query(
      `
        DELETE FROM businesses
        WHERE id = ?
      `,
      [businessId],
    );
  }
}
