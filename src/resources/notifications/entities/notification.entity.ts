import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OutboxEventType } from '../../outbox/entities/outbox_events.entity';

@Entity('notifications')
@Index(
  'UQ_notifications_source_event_recipient',
  ['source_event_id', 'recipient_id'], // makes searches fast, thereby making notification delivery fast
  { unique: true },
)
export class Notifications extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  business_id!: string; // Business tenant boundary.

  @Column({ type: 'varchar', length: 36 })
  recipient_id!: string; // Delivery destination

  @Column({ type: 'varchar', length: 36, nullable: true })
  store_id?: string;

  @Column({ type: 'varchar', length: 36 })
  source_event_id!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  type!: OutboxEventType;

  @Column({
    type: 'varchar',
    length: 100,
    default: '',
  })
  title!: string;

  @Column({
    type: 'varchar',
    length: 400,
    default: '',
  })
  message!: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_read?: boolean;

  @Column({ type: 'simple-json', default: null })
  data?: Record<string, any> | null;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;
}
