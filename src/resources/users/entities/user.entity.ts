import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../../auth/entities/role.entity';
import { Business } from '../../business/entities/business.entity';
import { Store } from '../../stores/entities/store.entity';
import { CloudinaryImage } from '../../../common/utils/helpers/cloudinary/cloudinary.service';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  constructor(props?: Partial<User>) {
    super();
    if (props) {
      Object.assign(this, props);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  phone_number?: string;

  @Column({ type: 'json', nullable: true })
  profile_picture?: CloudinaryImage | null;

  @Column({ type: 'varchar', length: 150, unique: true })
  company_email!: string;

  @Column({
    type: 'varchar',
    length: 36,
  })
  role_id!: string;

  @Column({
    type: 'varchar',
    length: 36,
  })
  business_id!: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  store_id?: string;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  @ManyToOne(() => Role, (role) => role.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => Business, (business) => business.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @ManyToOne(() => Store, (store) => store.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @UpdateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  @DeleteDateColumn({
    type: 'datetime',
    nullable: true,
  })
  deleted_at?: Date | null;
}
