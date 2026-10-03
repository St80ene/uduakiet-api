import { QueryRunner, Repository } from 'typeorm';
import { Permission } from '../../auth/entities/permission.entity';
import { Role } from '../../auth/entities/role.entity';
import { UserRole } from '../../common/enum/user_role.enum';

interface PermissionDefinition {
  name: string;
  description: string;
}

interface RoleDefinition {
  name: UserRole;
  description: string;
}

export async function seedGlobalPermissionsAndRoles(
  queryRunner: QueryRunner,
  modules: string[],
) {
  const permissionRepository: Repository<Permission> =
    queryRunner.manager.getRepository(Permission);
  const roleRepository: Repository<Role> =
    queryRunner.manager.getRepository(Role);

  const actions = ['create', 'read', 'update', 'delete'];
  const permissionDefinitions: PermissionDefinition[] = modules.flatMap(
    (module) =>
      actions.map((action) => ({
        name: `${module}.${action}`,
        description: `${action} ${module}`,
      })),
  );

  permissionDefinitions.push(
    { name: 'purchase_orders.approve', description: 'Approve purchase orders' },
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
    { name: UserRole.ADMIN, description: 'Business Owner or General Manager' },
    { name: UserRole.MANAGER, description: 'Branch or Store Manager' },
    { name: UserRole.STOREMAN, description: 'Warehouse / Inventory Handler' },
    { name: UserRole.CASHIER, description: 'Sales Point Operator' },
  ];

  const roles: Role[] = [];
  for (const definition of roleDefinitions) {
    const role = roleRepository.create(definition);
    roles.push(await roleRepository.save(role));
  }

  const superAdminRole = roles.find((r) => r.name === UserRole.SUPER_ADMIN)!;
  const adminRole = roles.find((r) => r.name === UserRole.ADMIN)!;

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

  return roles;
}
