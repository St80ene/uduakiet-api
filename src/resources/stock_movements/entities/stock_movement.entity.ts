import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Business } from '../../business/entities/business.entity';
import { Stock } from '../../stocks/entities/stock.entity';
import { User } from '../../users/entities/user.entity';

export enum StockMovementType {
  RECEIPT = 'RECEIPT',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  RETURN_IN = 'RETURN_IN',
  RETURN_OUT = 'RETURN_OUT',
  DAMAGE = 'DAMAGE',
  LOSS = 'LOSS',
  REVERSAL = 'REVERSAL',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
}

export enum StockMovementDirection {
  IN = 'INFLOW',
  OUT = 'OUTFLOW',
}

@Entity('stock_movements')
export class StockMovement extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  stock_id!: string;

  /**
   * Snapshot of the business tenant.
   *
   * Keeping this on the immutable ledger makes tenant-level
   * reporting and integrity checks easier.
   */
  @Column({ type: 'varchar', length: 36 })
  business_id!: string;

  @Column({ type: 'varchar', length: 36 })
  created_by_id?: string | null;

  @Column({
    type: 'varchar',
    length: 30,
  })
  type!: StockMovementType;

  /**
   * Explicit direction is necessary because ADJUSTMENT
   * can either increase or decrease stock.
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  direction!: StockMovementDirection;

  /**
   * Always store a positive quantity.
   *
   * Direction determines whether it is added or removed.
   */
  @Column({ type: 'int', unsigned: true })
  quantity!: number;

  /**
   * Stock balance before this movement.
   */
  @Column({ type: 'int', unsigned: true })
  quantity_before!: number;

  /**
   * Stock balance after this movement.
   */
  @Column({ type: 'int', unsigned: true })
  quantity_after!: number;

  /**
   * Historical cost snapshot at the time of the movement.
   */
  @Column('decimal', {
    precision: 12,
    scale: 2,
  })
  unit_cost_price!: number;

  /**
   * Historical selling price snapshot.
   *
   * This is useful for sales/reporting but may be null
   * for movements where selling price is irrelevant.
   */
  @Column('decimal', {
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unit_selling_price?: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string;

  @ManyToOne(() => Stock, (stock) => stock.movements, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'stock_id' })
  stock!: Stock;

  @ManyToOne(() => Business, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by_id' })
  created_by?: User | null;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;
}
