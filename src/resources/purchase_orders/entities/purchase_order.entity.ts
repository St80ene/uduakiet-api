import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PurchaseOrderItem } from './purchase_order_item.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Store } from '../../stores/entities/store.entity';
import { User } from '../../users/entities/user.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SENT_TO_SUPPLIER = 'SENT_TO_SUPPLIER',
}

export type PurchaseOrderListItem = Pick<
  PurchaseOrder,
  'id' | 'po_number' | 'status' | 'total_estimated_cost' | 'created_at'
> & {
  supplier_name: string | null;
  items_count: number;
};

// What the driver really returns before conversion
export type PurchaseOrderRawRow = Omit<
  PurchaseOrderListItem,
  'items_count' | 'total_estimated_cost'
> & {
  items_count: string | number;
  total_estimated_cost: string | number;
};

@Entity('purchase_orders')
@Index('idx_po_business_created', ['business_id', 'created_at'])
@Index('idx_po_business_status_created', [
  'business_id',
  'status',
  'created_at',
])
@Index('idx_po_business_store_created', [
  'business_id',
  'store_id',
  'created_at',
])
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  po_number!: string;

  @Column()
  supplier_id!: string;

  @Column({ type: 'varchar', length: 36 })
  store_id!: string;

  @Column({ type: 'varchar', length: 36 })
  business_id!: string;

  @Column({ type: 'varchar', length: 30, default: PurchaseOrderStatus.DRAFT })
  status?: PurchaseOrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  total_estimated_cost!: number;

  @Column()
  created_by_id!: string;

  @Column({ nullable: true })
  approved_by_id?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  user?: User | null;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchase_order, {
    cascade: true,
  })
  items!: PurchaseOrderItem[];

  @ManyToOne(() => Supplier, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @ManyToOne(() => Store, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
