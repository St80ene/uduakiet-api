import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  AuditLogAction,
  AuditLogEntity,
} from '../../../common/enum/audit_log.enum';
import { Business } from '../../business/entities/business.entity';
import { Store } from '../../stores/entities/store.entity';

export interface AuditMetaData {
  reason: string;
  [key: string]: unknown;
}

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'action',
    type: 'varchar',
    length: 255,
    nullable: true,
    enum: AuditLogAction,
  })
  action!: AuditLogAction;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string;

  @Column({ name: 'entity', type: 'varchar', length: 255, nullable: true })
  entity!: AuditLogEntity;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId!: string;

  @Column({ name: 'old_value', type: 'json', nullable: true })
  oldValue?: Record<string, any> | null;

  @Column({ name: 'new_value', type: 'json', nullable: true })
  newValue?: Record<string, any> | null;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: AuditMetaData | null;

  @Column({ type: 'char', length: 36, nullable: false })
  business_id!: string;

  @Column({ type: 'char', length: 36, nullable: true })
  store_id?: string;

  @ManyToOne(() => Business, (business) => business.audit_logs, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business?: Business;

  @ManyToOne(() => Store, (store) => store.audit_logs, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store?: Store;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;
}
