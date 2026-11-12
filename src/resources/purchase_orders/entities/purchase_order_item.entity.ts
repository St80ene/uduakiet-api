import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PurchaseOrder } from './purchase_order.entity';

import { Product } from '../../products/entities/product.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  purchase_order_id!: string;

  @Index()
  @Column()
  product_id!: string;

  @Index()
  @Column({ type: 'int' })
  quantity_requested!: number;

  @Column({ type: 'int', default: 0 })
  quantity_received!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  estimated_unit_cost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  total_cost!: number;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchase_order!: PurchaseOrder;

  @ManyToOne(() => Product, (product) => product.purchase_order_items, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
