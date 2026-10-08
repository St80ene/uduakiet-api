import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../resources/users/entities/user.entity';
import { RolePermissions } from './role_permissions.entity';
import { UserRole } from '../../common/enum/user_role.enum';
import { IsEnum } from 'class-validator';
import { Business } from '../../resources/business/entities/business.entity';

@Entity({ name: 'roles' })
@Unique(['name'])
export class Role {
  constructor(props?: Partial<Role>) {
    if (props) {
      Object.assign(this, props);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @IsEnum(UserRole, { message: 'Invalid role name' })
  @Column({
    type: 'varchar',
    length: 50,
    default: UserRole.CASHIER,
  })
  name!: UserRole;

  @Column({ type: 'varchar', length: 36, nullable: false })
  business_id!: string;

  @ManyToOne(() => Business, (business) => business.roles, {
    onDelete: 'CASCADE',
  })
  business!: Business;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];

  // It should be optional at the time of role creation, as permissions can be added later.
  @OneToMany(() => RolePermissions, (rolePermission) => rolePermission.role)
  rolePermissions?: RolePermissions[];

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;
}
