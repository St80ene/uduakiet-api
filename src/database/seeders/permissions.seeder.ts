import { QueryRunner } from 'typeorm';
import { Permission } from '../../auth/entities/permission.entity';
import { Role } from '../../auth/entities/role.entity';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { RolePermissions } from '../../auth/entities/role_permissions.entity';

const User_Permission = UserPermission;
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
    permissions: All_Permissions.filter(
      (p) => p !== User_Permission.BUSINESS_CREATE,
    ),
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
      ),
      User_Permission.USER_READ,
      User_Permission.ROLE_READ,
      User_Permission.BUSINESS_SETTINGS_READ,
    ],
  },
  {
    name: UserRole.STOREMAN,
    description: 'Warehouse / Inventory Handler',
    permissions: [
      User_Permission.PRODUCT_READ,
      User_Permission.PRODUCT_CREATE,
      User_Permission.PRODUCT_UPDATE,
      User_Permission.PRODUCT_SOURCE_READ,
      User_Permission.CATEGORY_READ,
      User_Permission.STOCK_READ,
      User_Permission.STOCK_ADJUST,
      User_Permission.STOCK_TRANSFER,
      User_Permission.STOCK_MOVEMENT_READ,
      User_Permission.STORE_READ,
      User_Permission.PURCHASE_READ,
      User_Permission.PURCHASE_CREATE,
      User_Permission.SUPPLIER_READ,
      User_Permission.DASHBOARD_VIEW,
      User_Permission.DASHBOARD_INVENTORY_VIEW,
      User_Permission.DASHBOARD_WAREHOUSE_VIEW,
      User_Permission.REPORT_VIEW,
      User_Permission.REPORT_INVENTORY_VIEW,
    ],
  },
  {
    name: UserRole.CASHIER,
    description: 'Sales Point Operator',
    permissions: [
      User_Permission.PRODUCT_READ,
      User_Permission.CATEGORY_READ,
      User_Permission.STOCK_READ,
      User_Permission.SALE_READ,
      User_Permission.SALE_CREATE,
      User_Permission.CUSTOMER_READ,
      User_Permission.CUSTOMER_CREATE,
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
