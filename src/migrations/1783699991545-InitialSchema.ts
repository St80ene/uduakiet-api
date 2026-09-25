import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

import { AuditLogAction, AuditLogEntity } from '../common/enum/audit_log.enum';

export class InitialSchema1783699991545 implements MigrationInterface {
  name = 'InitialSchema1783699991545';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * ============================================================
     * BUSINESSES
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'businesses',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'legal_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'registration_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'tax_identification_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'business_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'address_line_1',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'address_line_2',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            default: "'NG'",
          },
          {
            name: 'postal_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'logo',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'NGN'",
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            default: "'Africa/Lagos'",
          },
          {
            name: 'locale',
            type: 'varchar',
            length: '10',
            default: "'en-NG'",
          },
          {
            name: 'tax_settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    /**
     * ============================================================
     * STORES
     * ============================================================
     *
     * One business can have many stores.
     *
     * Unique:
     *   business_id + code
     *
     * Non-unique:
     *   business_id
     */

    await queryRunner.createTable(
      new Table({
        name: 'stores',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'address',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            default: "'NG'",
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'stores',
      new TableForeignKey({
        name: 'FK_stores_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'stores',
      new TableIndex({
        name: 'UQ_stores_business_code',
        columnNames: ['business_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'stores',
      new TableIndex({
        name: 'IDX_stores_business',
        columnNames: ['business_id'],
      }),
    );

    /**
     * ============================================================
     * ROLES
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    /**
     * ============================================================
     * PERMISSIONS
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    /**
     * ============================================================
     * ROLE PERMISSIONS
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'role_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'permission_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'UQ_role_permissions_role_permission',
        columnNames: ['role_id', 'permission_id'],
      }),
    );

    await queryRunner.createForeignKeys('role_permissions', [
      new TableForeignKey({
        name: 'FK_role_permissions_role',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_role_permissions_permission',
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    ]);

    /**
     * ============================================================
     * USERS
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'store_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'company_email',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'profile_picture',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'role_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('users', [
      new TableForeignKey({
        name: 'FK_users_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_users_store',
        columnNames: ['store_id'],
        referencedTableName: 'stores',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_users_role',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'UQ_users_company_email',
        columnNames: ['business_id', 'company_email'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndices('users', [
      new TableIndex({
        name: 'IDX_users_business',
        columnNames: ['business_id'],
      }),
      new TableIndex({
        name: 'IDX_users_store',
        columnNames: ['store_id'],
      }),
      new TableIndex({
        name: 'IDX_users_role',
        columnNames: ['role_id'],
      }),
    ]);

    /**
     * ============================================================
     * USER AUTH
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'user_auth',
        columns: [
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'refresh_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'password_reset_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'password_reset_expires_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'is_email_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'email_verification_token',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'email_verification_expires_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'failed_login_attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'locked_until',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'last_login_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'last_login_ip',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'user_auth',
      new TableForeignKey({
        name: 'FK_user_auth_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    /**
     * ============================================================
     * CATEGORIES
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        name: 'FK_categories_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'UQ_categories_business_name',
        columnNames: ['business_id', 'name'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'categories',
      new TableIndex({
        name: 'IDX_categories_business',
        columnNames: ['business_id'],
      }),
    );

    /**
     * ============================================================
     * PRODUCTS
     * ============================================================
     *
     * Product = catalog definition.
     */

    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'category_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'images',
            type: 'json',
          },
          {
            name: 'uom_type',
            type: 'varchar',
            length: '20',
            default: "'UNIT'",
          },
          {
            name: 'uom_base_name',
            type: 'varchar',
            length: '10',
            default: "'pcs'",
          },
          {
            name: 'uom_display_name',
            type: 'varchar',
            length: '10',
            default: "'pcs'",
          },
          {
            name: 'cost_price',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'selling_price',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'default_reorder_point',
            type: 'int',
            default: 5,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'INACTIVE'",
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('products', [
      new TableForeignKey({
        name: 'FK_products_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_products_category',
        columnNames: ['category_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndices('products', [
      new TableIndex({
        name: 'IDX_products_business',
        columnNames: ['business_id'],
      }),
      new TableIndex({
        name: 'IDX_products_category',
        columnNames: ['category_id'],
      }),
      new TableIndex({
        name: 'IDX_products_business_status',
        columnNames: ['business_id', 'status'],
      }),
    ]);

    /**
     * ============================================================
     * SUPPLIERS
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'suppliers',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'suppliers',
      new TableForeignKey({
        name: 'FK_suppliers_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'suppliers',
      new TableIndex({
        name: 'UQ_suppliers_business_name',
        columnNames: ['business_id', 'name'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'suppliers',
      new TableIndex({
        name: 'IDX_suppliers_business',
        columnNames: ['business_id'],
      }),
    );

    /**
     * ============================================================
     * PRODUCT SOURCES
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'product_sources',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'product_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'supplier_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('product_sources', [
      new TableForeignKey({
        name: 'FK_product_sources_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_product_sources_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_product_sources_supplier',
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'product_sources',
      new TableIndex({
        name: 'UQ_product_sources_product_supplier',
        columnNames: ['product_id', 'supplier_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndices('product_sources', [
      new TableIndex({
        name: 'IDX_product_sources_business',
        columnNames: ['business_id'],
      }),
      new TableIndex({
        name: 'IDX_product_sources_product',
        columnNames: ['product_id'],
      }),
      new TableIndex({
        name: 'IDX_product_sources_supplier',
        columnNames: ['supplier_id'],
      }),
    ]);

    /**
     * ============================================================
     * STOCKS
     * ============================================================
     *
     * Stock = CURRENT BALANCE.
     *
     * One row represents:
     *
     *     Product × Store
     *
     * quantity is the current inventory balance.
     */

    await queryRunner.createTable(
      new Table({
        name: 'stocks',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'product_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'store_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'current_quantity',
            type: 'int',
            unsigned: true,
            default: 0,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('stocks', [
      new TableForeignKey({
        name: 'FK_stocks_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_stocks_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_stocks_store',
        columnNames: ['store_id'],
        referencedTableName: 'stores',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'stocks',
      new TableIndex({
        name: 'UQ_stocks_product_store',
        columnNames: ['product_id', 'store_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndices('stocks', [
      new TableIndex({
        name: 'IDX_stocks_business',
        columnNames: ['business_id'],
      }),
      new TableIndex({
        name: 'IDX_stocks_store',
        columnNames: ['store_id'],
      }),
      new TableIndex({
        name: 'IDX_stocks_product',
        columnNames: ['product_id'],
      }),
      new TableIndex({
        name: 'IDX_stocks_store_reorder',
        columnNames: ['store_id', 'quantity'],
      }),
    ]);

    /**
     * ============================================================
     * STOCK MOVEMENTS
     * ============================================================
     *
     * StockMovement = IMMUTABLE INVENTORY LEDGER.
     *
     * It records how the current Stock balance changed.
     */

    await queryRunner.createTable(
      new Table({
        name: 'stock_movements',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'stock_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'created_by_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'direction',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'quantity',
            type: 'int',
            unsigned: true,
          },
          {
            name: 'quantity_before',
            type: 'int',
            unsigned: true,
          },
          {
            name: 'quantity_after',
            type: 'int',
            unsigned: true,
          },
          {
            name: 'unit_cost_price',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'unit_selling_price',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('stock_movements', [
      new TableForeignKey({
        name: 'FK_stock_movements_stock',
        columnNames: ['stock_id'],
        referencedTableName: 'stocks',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_stock_movements_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_stock_movements_created_by',
        columnNames: ['created_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndices('stock_movements', [
      new TableIndex({
        name: 'IDX_stock_movements_business_created_at',
        columnNames: ['business_id', 'created_at'],
      }),
      new TableIndex({
        name: 'IDX_stock_movements_stock_created_at',
        columnNames: ['stock_id', 'created_at'],
      }),
      new TableIndex({
        name: 'IDX_stock_movements_created_by',
        columnNames: ['created_by_id'],
      }),
      new TableIndex({
        name: 'IDX_stock_movements_type',
        columnNames: ['type'],
      }),
      new TableIndex({
        name: 'IDX_stock_movements_direction',
        columnNames: ['direction'],
      }),
      new TableIndex({
        name: 'IDX_stock_movements_reference',
        columnNames: ['reference_type', 'reference_id'],
      }),
    ]);

    /**
     * ============================================================
     * PURCHASE ORDERS
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'purchase_orders',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'store_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'po_number',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'supplier_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'DRAFT'",
          },
          {
            name: 'total_estimated_cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'created_by_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'approved_by_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('purchase_orders', [
      new TableForeignKey({
        name: 'FK_purchase_orders_store',
        columnNames: ['store_id'],
        referencedTableName: 'stores',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_purchase_orders_supplier',
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_purchase_orders_created_by',
        columnNames: ['created_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_purchase_orders_approved_by',
        columnNames: ['approved_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'purchase_orders',
      new TableIndex({
        name: 'UQ_purchase_orders_store_po_number',
        columnNames: ['store_id', 'po_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndices('purchase_orders', [
      new TableIndex({
        name: 'IDX_purchase_orders_store',
        columnNames: ['store_id'],
      }),
      new TableIndex({
        name: 'IDX_purchase_orders_supplier',
        columnNames: ['supplier_id'],
      }),
      new TableIndex({
        name: 'IDX_purchase_orders_status',
        columnNames: ['status'],
      }),
      new TableIndex({
        name: 'IDX_purchase_orders_created_by',
        columnNames: ['created_by_id'],
      }),
    ]);

    /**
     * ============================================================
     * PURCHASE ORDER ITEMS
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'purchase_order_items',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'purchase_order_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'product_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'quantity_requested',
            type: 'int',
          },
          {
            name: 'estimated_unit_cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('purchase_order_items', [
      new TableForeignKey({
        name: 'FK_purchase_order_items_purchase_order',
        columnNames: ['purchase_order_id'],
        referencedTableName: 'purchase_orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_purchase_order_items_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndices('purchase_order_items', [
      new TableIndex({
        name: 'IDX_purchase_order_items_purchase_order',
        columnNames: ['purchase_order_id'],
      }),
      new TableIndex({
        name: 'IDX_purchase_order_items_product',
        columnNames: ['product_id'],
      }),
    ]);

    /**
     * ============================================================
     * AUDIT LOGS
     * ============================================================
     */

    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'store_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'enum',
            enum: Object.values(AuditLogAction),
          },
          {
            name: 'entity',
            type: 'enum',
            enum: Object.values(AuditLogEntity),
          },
          {
            name: 'entity_id',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'old_value',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'new_value',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('audit_logs', [
      new TableForeignKey({
        name: 'FK_audit_logs_business',
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_audit_logs_store',
        columnNames: ['store_id'],
        referencedTableName: 'stores',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_audit_logs_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndices('audit_logs', [
      new TableIndex({
        name: 'IDX_audit_logs_business',
        columnNames: ['business_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_store',
        columnNames: ['store_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_user',
        columnNames: ['user_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_action',
        columnNames: ['action'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_entity',
        columnNames: ['entity'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_entity_id',
        columnNames: ['entity_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_created_at',
        columnNames: ['created_at'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_entity_lookup',
        columnNames: ['entity', 'entity_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_business_entity',
        columnNames: ['business_id', 'entity', 'entity_id'],
      }),
      new TableIndex({
        name: 'IDX_audit_logs_store_created_at',
        columnNames: ['store_id', 'created_at'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs', true);
    await queryRunner.dropTable('purchase_order_items', true);
    await queryRunner.dropTable('purchase_orders', true);
    await queryRunner.dropTable('stock_movements', true);
    await queryRunner.dropTable('stocks', true);
    await queryRunner.dropTable('product_sources', true);
    await queryRunner.dropTable('suppliers', true);
    await queryRunner.dropTable('products', true);
    await queryRunner.dropTable('categories', true);
    await queryRunner.dropTable('user_auth', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('role_permissions', true);
    await queryRunner.dropTable('permissions', true);
    await queryRunner.dropTable('roles', true);
    await queryRunner.dropTable('stores', true);
    await queryRunner.dropTable('businesses', true);
  }
}
