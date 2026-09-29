import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Stock } from '../../stocks/entities/stock.entity';
import { AuditLog } from '../../audit_logs/entities/audit_log.entity';
import { Business } from '../../business/entities/business.entity';
import { PurchaseOrder } from '../../purchase_orders/entities/purchase_order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('stores')
@Index(['business_id', 'code'], { unique: true })
@Index(['business_id', 'name'], { unique: true })
export class Store extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  business_id!: string;

  @ManyToOne(() => Business, (business) => business.stores, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number?: string;

  @OneToMany(() => AuditLog, (audit_log) => audit_log.store)
  audit_logs!: AuditLog[];

  @OneToMany(() => User, (user) => user.store)
  users!: User[];

  @OneToMany(() => Stock, (stock) => stock.store)
  stocks!: Stock[];

  @OneToMany(() => PurchaseOrder, (purchase_order) => purchase_order.store)
  purchase_orders!: PurchaseOrder[];

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

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime' })
  deleted_at?: Date | null;
}
