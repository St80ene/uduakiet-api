import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase_order.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  purchase_order_id!: string;

  @Column()
  product_id!: string;

  @Column({ type: 'int' })
  quantity_requested!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  estimated_unit_cost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_cost!: number;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchase_order!: PurchaseOrder;
}
