import { QueryRunner, Repository } from 'typeorm';
import { User } from '../../resources/users/entities/user.entity';
import { UserAuth } from '../../auth/entities/user_auth.entity';
import { UserRole } from '../../common/enum/user_role.enum';
import { Role } from '../../auth/entities/role.entity';
import { BusinessBlueprint } from './business.seeder';
import { faker } from '@faker-js/faker';

export interface ITenantUser {
  id: string;
  email: string;
}

export async function seedTenantUsers(
  queryRunner: QueryRunner,
  businessId: string,
  primaryStoreId: string,
  bizBlueprint: BusinessBlueprint,
  roles: Role[],
  usersPerBusiness: number,
  defaultPassword: string,
): Promise<ITenantUser[]> {
  const userRepository: Repository<User> =
    queryRunner.manager.getRepository(User);
  const userAuthRepository: Repository<UserAuth> =
    queryRunner.manager.getRepository(UserAuth);

  const superAdminRole = roles.find(
    (role) => role.name === UserRole.SUPER_ADMIN,
  )!;

  const adminRole = roles.find((role) => role.name === UserRole.ADMIN)!;
  const managerRole = roles.find((role) => role.name === UserRole.MANAGER)!;
  const storemanRole = roles.find((role) => role.name === UserRole.STOREMAN)!;
  const cashierRole = roles.find((role) => role.name === UserRole.CASHIER)!;

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

  const assignedRoleList = userRolesToAssign.slice(0, usersPerBusiness);
  const tenantUsers: { id: string; email: string }[] = [];

  for (const uConfig of assignedRoleList) {
    const userEmail = `${uConfig.emailPrefix}.${bizBlueprint.prefix.toLowerCase()}@uduakiet.com`;
    const profilePictureUrl = faker.image.personPortrait({
      size: 512,
    });

    const user_profile: Partial<User> = {
      business_id: businessId,
      store_id: primaryStoreId,
      first_name: uConfig.first,
      last_name: `${uConfig.last} (${bizBlueprint.prefix})`,
      company_email: userEmail,
      role_id: uConfig.role.id,
      profile_picture: profilePictureUrl
        ? {
            url: profilePictureUrl,
            publicId: `seed_avatar_${faker.string.alphanumeric(8)}`,
          }
        : null,
    };

    const createdUser = userRepository.create(user_profile);

    const savedUser = await userRepository.save(createdUser);

    await userAuthRepository.save(
      userAuthRepository.create({
        user_id: savedUser.id,
        password: defaultPassword,
        is_email_verified: true,
      }),
    );

    console.log(
      `Seeded user: ${userEmail} with role: ${uConfig.role.name} for business: ${bizBlueprint.display_name}`,
    );

    tenantUsers.push({ id: savedUser.id, email: userEmail });
  }

  return tenantUsers;
}
