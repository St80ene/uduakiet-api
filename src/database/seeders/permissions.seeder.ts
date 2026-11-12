import { QueryRunner } from 'typeorm';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { UserRole } from '../../common/enum/user_role.enum';
import { Permission } from '../../auth/entities/permission.entity';
import { Role } from '../../auth/entities/role.entity';
import { RolePermissions } from '../../auth/entities/role_permissions.entity';

const {
  PRODUCT_READ,
  PRODUCT_CREATE,
  PRODUCT_UPDATE,
  PRODUCT_SOURCE_READ,
  CATEGORY_READ,
  STOCK_READ,
  STOCK_ADJUST,
  STOCK_TRANSFER,
  STOCK_MOVEMENT_READ,
  STORE_READ,
  SUPPLIER_READ,
  DASHBOARD_VIEW,
  DASHBOARD_INVENTORY_VIEW,
  DASHBOARD_WAREHOUSE_VIEW,
  REPORT_VIEW,
  REPORT_INVENTORY_VIEW,
  USER_READ,
  ROLE_READ,
  BUSINESS_SETTINGS_READ,
  SALE_READ,
  SALE_CREATE,
  CUSTOMER_READ,
  CUSTOMER_CREATE,
  NOTIFICATION_UNREAD_COUNT,
  NOTIFICATION_READ_ALL,
  NOTIFICATION_UPDATE_READ_ALL,
  NOTIFICATION_READ_ONE,
} = UserPermission;

const All_Permissions: UserPermission[] = Object.values(UserPermission);

/**
 * Returns all permissions belonging to the specified resources.
 * Example: product:read, product:create, product:update.
 */
const Permitted_Resources = (...resources: string[]): UserPermission[] =>
  All_Permissions.filter((permission) =>
    resources.includes(permission.split(':')[0]),
  );

/**
 * Prevent duplicate permissions when combining multiple permission groups.
 */
const Unique_Permissions = (
  permissions: UserPermission[],
): UserPermission[] => [...new Set(permissions)];

/**
 * All purchase-related permissions.
 */
const PURCHASE_PERMISSIONS = All_Permissions.filter((permission) =>
  permission.startsWith('purchase:'),
);

/**
 * Purchase permissions allocated according to the controller.
 *
 * SUPER_ADMIN has all permissions through All_Permissions.
 * The other roles receive only the permissions required by their routes.
 */
const PURCHASE_ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  [UserRole.SUPER_ADMIN]: PURCHASE_PERMISSIONS,

  [UserRole.ADMIN]: [
    UserPermission.PURCHASE_READ,
    UserPermission.PURCHASE_APPROVE,
    UserPermission.PURCHASE_SEND,
    UserPermission.PURCHASE_REJECT,
    UserPermission.PURCHASE_CANCEL,
  ],

  [UserRole.MANAGER]: [
    UserPermission.PURCHASE_READ,
    UserPermission.PURCHASE_UPDATE,
    UserPermission.PURCHASE_RECEIVE,
    UserPermission.PURCHASE_DELETE,
    UserPermission.PURCHASE_APPROVE,
    UserPermission.PURCHASE_SEND,
    UserPermission.PURCHASE_REJECT,
    UserPermission.PURCHASE_CANCEL,
  ],

  [UserRole.STOREMAN]: [
    UserPermission.PURCHASE_CREATE,
    UserPermission.PURCHASE_READ,
    UserPermission.PURCHASE_UPDATE,
    UserPermission.PURCHASE_SUBMIT,
    UserPermission.PURCHASE_RECEIVE,
    UserPermission.PURCHASE_DELETE,
  ],

  [UserRole.CASHIER]: [],

  [UserRole.SUPPLIER]: [],
};

export interface RoleDefinition {
  name: UserRole;
  description: string;
  permissions: UserPermission[];
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  // ============================================================
  // SUPER ADMIN
  // ============================================================
  {
    name: UserRole.SUPER_ADMIN,
    description: 'System or Platform Administrator',
    permissions: All_Permissions,
  },

  // ============================================================
  // ADMIN
  // ============================================================
  {
    name: UserRole.ADMIN,
    description: 'Business Owner or General Manager',

    permissions: Unique_Permissions([
      // All business permissions except business creation
      ...All_Permissions.filter(
        (permission) =>
          permission !== UserPermission.BUSINESS_CREATE &&
          !PURCHASE_PERMISSIONS.includes(permission),
      ),

      // Procurement permissions explicitly allocated
      ...PURCHASE_ROLE_PERMISSIONS[UserRole.ADMIN],
    ]),
  },

  // ============================================================
  // MANAGER
  // ============================================================
  {
    name: UserRole.MANAGER,
    description: 'Branch or Store Manager',

    permissions: Unique_Permissions([
      // Products, sourcing, audit, categories, suppliers,
      // inventory, stores, sales, customers and notifications.
      ...Permitted_Resources(
        'product',
        'product_source',
        'product_audit_log',
        'category',
        'supplier',
        'supplier_metrics',
        'stock',
        'stock_movement',
        'store',
        'audit_log',
        'sale',
        'customer',
        'notification',
      ),

      // Dashboard permissions
      UserPermission.DASHBOARD_VIEW,
      UserPermission.DASHBOARD_SALES_VIEW,
      UserPermission.DASHBOARD_INVENTORY_VIEW,
      UserPermission.DASHBOARD_PROCUREMENT_VIEW,
      UserPermission.DASHBOARD_WAREHOUSE_VIEW,

      // Report permissions
      UserPermission.REPORT_VIEW,
      UserPermission.REPORT_SALES_VIEW,
      UserPermission.REPORT_INVENTORY_VIEW,
      UserPermission.REPORT_FINANCIAL_VIEW,
      UserPermission.REPORT_EXPORT,

      // User and role visibility
      USER_READ,
      ROLE_READ,

      // Business settings
      BUSINESS_SETTINGS_READ,

      // Explicit procurement permissions
      ...PURCHASE_ROLE_PERMISSIONS[UserRole.MANAGER],
    ]),
  },

  // ============================================================
  // STOREMAN
  // ============================================================
  {
    name: UserRole.STOREMAN,
    description: 'Warehouse / Inventory Handler',

    permissions: [
      // Products
      PRODUCT_READ,
      PRODUCT_CREATE,
      PRODUCT_UPDATE,
      PRODUCT_SOURCE_READ,

      // Categories
      CATEGORY_READ,

      // Inventory
      STOCK_READ,
      STOCK_ADJUST,
      STOCK_TRANSFER,
      STOCK_MOVEMENT_READ,

      // Stores
      STORE_READ,

      // Procurement
      ...PURCHASE_ROLE_PERMISSIONS[UserRole.STOREMAN],

      // Suppliers
      SUPPLIER_READ,

      // Dashboard
      DASHBOARD_VIEW,
      DASHBOARD_INVENTORY_VIEW,
      DASHBOARD_WAREHOUSE_VIEW,

      // Reports
      REPORT_VIEW,
      REPORT_INVENTORY_VIEW,

      // Notifications
      NOTIFICATION_UNREAD_COUNT,
      NOTIFICATION_READ_ALL,
      NOTIFICATION_UPDATE_READ_ALL,
      NOTIFICATION_READ_ONE,
    ],
  },

  // ============================================================
  // CASHIER
  // ============================================================
  {
    name: UserRole.CASHIER,
    description: 'Sales Point Operator',

    permissions: [
      // Products
      PRODUCT_READ,

      // Categories
      CATEGORY_READ,

      // Inventory visibility
      STOCK_READ,

      // Sales
      SALE_READ,
      SALE_CREATE,

      // Customers
      CUSTOMER_READ,
      CUSTOMER_CREATE,
    ],
  },
];

const describe = (name: string): string => {
  const [resource, action] = name.split(':');
  return `${action.replace(/_/g, ' ')} ${resource.replace(/_/g, ' ')}`;
};

export async function seedGlobalPermissionsAndRoles(
  queryRunner: QueryRunner,
  businessId: string,
) {
  const permissionRepository = queryRunner.manager.getRepository(Permission);
  const roleRepository = queryRunner.manager.getRepository(Role);
  const rolePermissionRepository =
    queryRunner.manager.getRepository(RolePermissions);

  // 1. Permissions are global: create only the ones that don't exist yet
  const existingPermissions = await permissionRepository.find();
  const byName = new Map(existingPermissions.map((p) => [p.name, p]));

  const missingPermissions = All_Permissions.filter(
    (name) => !byName.has(name),
  ).map((name) =>
    permissionRepository.create({ name, description: describe(name) }),
  );
  if (missingPermissions.length) {
    const saved = await permissionRepository.save(missingPermissions);
    saved.forEach((p) => byName.set(p.name, p));
  }

  // 2. Roles for this business: check if role exists for this business before saving
  const roles: Role[] = [];
  for (const definition of ROLE_DEFINITIONS) {
    let role = await roleRepository.findOne({
      where: {
        name: definition.name,
        business_id: businessId,
      },
    });

    if (!role) {
      role = await roleRepository.save(
        roleRepository.create({
          name: definition.name,
          description: definition.description,
          business_id: businessId,
          is_system: true,
        }),
      );
    }
    roles.push(role);

    // 3. Sync permissions for this role safely to avoid junction table unique constraint violations
    const existingRolePermissions = await rolePermissionRepository.find({
      where: { role_id: role.id },
    });
    const existingPermissionIds = new Set(
      existingRolePermissions.map((rp) => rp.permission_id),
    );

    const missingRolePermissions = [...new Set(definition.permissions)]
      .map((name) => byName.get(name)!.id)
      .filter((permissionId) => !existingPermissionIds.has(permissionId)) // Only add missing junctions
      .map((permissionId) =>
        rolePermissionRepository.create({
          role_id: role.id,
          permission_id: permissionId,
        }),
      );

    if (missingRolePermissions.length) {
      await rolePermissionRepository.save(missingRolePermissions);
    }
  }

  return roles;
}
