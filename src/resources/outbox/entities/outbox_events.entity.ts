import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum OutboxEventAggregateType {
  STOCKS = 'stocks',
}

export interface LowStockEvent {
  event_id: string;
  business_id: string;
  store_id: string;
  product_id: string;
  current_quantity: number;
  reorder_point: number;
  is_out_of_stock: boolean;
  occurred_at: Date;
}

export type OutboxEventPayload = LowStockEvent | Record<string, unknown>;

export enum OutboxEventType {
  LOWSTOCK_DETECTED = 'stock.low_detected',
}

@Entity('outbox_events')
@Index(['status', 'available_at'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  event_type!: OutboxEventType; // What happened?

  @Column({ type: 'varchar', length: 36 })
  aggregate_id!: string; // The ID of the affected entity.

  @Column({ type: 'varchar', length: 100 })
  aggregate_type!: OutboxEventAggregateType; // e.g. 'Stock', 'PurchaseOrder'

  @Column({ type: 'varchar', length: 36 })
  business_id!: string;

  @Column({ type: 'varchar', length: 36 })
  store_id!: string;

  @Column({ type: 'json', nullable: true })
  payload!: OutboxEventPayload | Record<string, any> | null; // The data associated with the event.

  @Column({
    type: 'varchar',
    length: 20,
    default: OutboxEventStatus.PENDING,
  })
  status!: OutboxEventStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'datetime' })
  available_at!: Date;

  @Column({ type: 'datetime', nullable: true })
  processed_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  last_error!: string | null;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;
}
