import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PurchaseOrder } from './purchase_order.entity';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

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

  @Column({ type: 'int' })
  quantity_received!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  estimated_unit_cost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_cost!: number;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchase_order!: PurchaseOrder;
}

export class ReceivePurchaseOrderItemDto {
  @IsUUID()
  item_id!: string;

  @IsInt()
  @Min(1)
  quantity_received!: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items!: ReceivePurchaseOrderItemDto[];
}
