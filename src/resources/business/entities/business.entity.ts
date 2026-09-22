import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BusinessSettingsEntity } from './business_settings.entity';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { AuditLog } from '../../audit_logs/entities/audit_log.entity';
import { Store } from '../../stores/entities/store.entity';
import { CloudinaryImage } from '../../../common/utils/helpers/cloudinary/cloudinary.service';
import { Stock } from '../../stocks/entities/stock.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { ProductSource } from '../../product_sources/entities/product_source.entity';

export enum BusinessStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}
@Entity({ name: 'businesses' })
export class Business extends BaseEntity {
  constructor(props?: Partial<Business>) {
    super();

    if (props) {
      Object.assign(this, props);
    }
  }

  // ==========================================================
  // IDENTITY
  // ==========================================================

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'legal_name',
    type: 'varchar',
    length: 255,
  })
  legal_name!: string;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 255,
  })
  display_name!: string;

  @Column({
    name: 'registration_number',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  registration_number?: string | null;

  @Column({
    name: 'tax_identification_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  tax_identification_number?: string | null;

  @Column({
    name: 'business_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  business_type?: string | null;

  // ==========================================================
  // CONTACT
  // ==========================================================

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  email?: string | null;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  phone_number?: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  website?: string | null;

  // ==========================================================
  // ADDRESS
  // ==========================================================

  @Column({
    name: 'address_line_1',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  address_line_1?: string | null;

  @Column({
    name: 'address_line_2',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  address_line_2?: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  city?: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  state?: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'NG',
  })
  country!: string;

  @Column({
    name: 'postal_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  postal_code?: string | null;

  // ==========================================================
  // BRANDING
  // ==========================================================

  @Column({
    type: 'json',
    nullable: true,
  })
  logo?: CloudinaryImage | null;

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  @Column({
    type: 'varchar',
    length: 3,
    default: 'NGN',
  })
  currency!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'Africa/Lagos',
  })
  timezone!: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'en-NG',
  })
  locale!: string;

  @Column({
    name: 'tax_settings',
    type: 'json',
    nullable: true,
  })
  tax_settings?: Record<string, unknown> | null;

  @Column({
    type: 'json',
    nullable: true,
  })
  settings?: BusinessSettingsEntity | null;

  // ==========================================================
  // LIFECYCLE
  // ==========================================================

  // ==========================================================
  // RELATIONSHIPS
  // ==========================================================

  @OneToMany(() => Category, (category) => category.business)
  categories!: Category[];

  @OneToMany(() => Supplier, (supplier) => supplier.business)
  suppliers!: Supplier[];

  @OneToMany(() => User, (user) => user.business)
  users!: User[];

  @OneToMany(() => Store, (store) => store.business)
  stores!: Store[];

  @OneToMany(() => Product, (product) => product.business)
  products!: Product[];

  @OneToMany(() => Stock, (stock) => stock.business)
  stocks!: Stock[];

  @OneToMany(() => AuditLog, (audit_log) => audit_log.business)
  audit_logs!: AuditLog[];

  @OneToMany(() => ProductSource, (product_source) => product_source.business)
  product_sources!: ProductSource[]; // Table to link suppliers and products

  // ==========================================================
  // TIMESTAMPS
  // ==========================================================

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deleted_at!: Date | null;
}
