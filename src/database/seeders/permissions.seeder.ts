import { QueryRunner } from 'typeorm';
import { Permission } from '../../auth/entities/permission.entity';
import { Role } from '../../auth/entities/role.entity';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserPermission } from '../../common/enum/user_permission.enum';
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
  PURCHASE_READ,
  PURCHASE_CREATE,
  SUPPLIER_READ,
  DASHBOARD_VIEW,
  DASHBOARD_INVENTORY_VIEW,
  DASHBOARD_WAREHOUSE_VIEW,
  REPORT_VIEW,
  REPORT_INVENTORY_VIEW,
  BUSINESS_CREATE,
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

/** All permissions whose resource (the part before ':') is in the list. */
const Permitted_Resources = (...resources: string[]): UserPermission[] =>
  All_Permissions.filter((p) => resources.includes(p.split(':')[0]));

interface RoleDefinition {
  name: UserRole;
  description: string;
  permissions: UserPermission[];
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: UserRole.SUPER_ADMIN,
    description: 'System or Platform Administrator',
    permissions: All_Permissions,
  },
  {
    name: UserRole.ADMIN,
    description: 'Business Owner or General Manager',
    // Everything except platform-level business creation
    permissions: All_Permissions.filter((p) => p !== BUSINESS_CREATE),
  },
  {
    name: UserRole.MANAGER,
    description: 'Branch or Store Manager',
    permissions: [
      ...Permitted_Resources(
        'product',
        'product_source',
        'product_audit_log',
        'category',
        'supplier',
        'stock',
        'stock_movement',
        'purchase',
        'store',
        'audit_log',
        'sale',
        'customer',
        'dashboard',
        'report',
        'notification',
      ),
      USER_READ,
      ROLE_READ,
      BUSINESS_SETTINGS_READ,
      NOTIFICATION_UNREAD_COUNT,
      NOTIFICATION_READ_ALL,
      NOTIFICATION_UPDATE_READ_ALL,
      NOTIFICATION_READ_ONE,
    ],
  },
  {
    name: UserRole.STOREMAN,
    description: 'Warehouse / Inventory Handler',
    permissions: [
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
      PURCHASE_READ,
      PURCHASE_CREATE,
      SUPPLIER_READ,
      DASHBOARD_VIEW,
      DASHBOARD_INVENTORY_VIEW,
      DASHBOARD_WAREHOUSE_VIEW,
      REPORT_VIEW,
      REPORT_INVENTORY_VIEW,
      NOTIFICATION_UNREAD_COUNT,
      NOTIFICATION_READ_ALL,
      NOTIFICATION_UPDATE_READ_ALL,
      NOTIFICATION_READ_ONE,
    ],
  },
  {
    name: UserRole.CASHIER,
    description: 'Sales Point Operator',
    permissions: [
      PRODUCT_READ,
      CATEGORY_READ,
      STOCK_READ,
      SALE_READ,
      SALE_CREATE,
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

  // 1. Permissions are global: create only the ones that don't exist yet,
  //    so seeding a second business doesn't hit the unique constraint on name.
  const existing = await permissionRepository.find();
  const byName = new Map(existing.map((p) => [p.name, p]));

  const missing = All_Permissions.filter((name) => !byName.has(name)).map(
    (name) =>
      permissionRepository.create({ name, description: describe(name) }),
  );
  if (missing.length) {
    const saved = await permissionRepository.save(missing);
    saved.forEach((p) => byName.set(p.name, p));
  }

  // 2. Roles for this business, each wired to its default permissions
  //    through the RolePermissions junction entity.
  const roles: Role[] = [];
  for (const definition of ROLE_DEFINITIONS) {
    const role = await roleRepository.save(
      roleRepository.create({
        name: definition.name,
        description: definition.description,
        business_id: businessId,
        is_system: true,
      }),
    );
    roles.push(role);

    const rolePermissions = [...new Set(definition.permissions)].map((name) =>
      rolePermissionRepository.create({
        role_id: role.id,
        permission_id: byName.get(name)!.id,
      }),
    );

    if (rolePermissions.length) {
      await rolePermissionRepository.save(rolePermissions);
    }
  }

  return roles;
}
