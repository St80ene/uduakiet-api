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
