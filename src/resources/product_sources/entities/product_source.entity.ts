import {
  Entity,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Product } from '../../products/entities/product.entity';
import { Business } from '../../business/entities/business.entity';

@Entity({ name: 'product_sources' })
@Index(['product_id', 'supplier_id'], { unique: true }) // 👈 Prevents duplicate mappings for the same product + supplier pair
export class ProductSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  product_id!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  business_id!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  supplier_id!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost_price!: number; // Wholesaler cost price (moves dynamically per supplier)

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier_sku?: string; // The external item code this vendor looks for on invoices

  @Column({ type: 'int', nullable: true })
  estimated_lead_time_days?: number;

  // Relation: Many product sources can belong to one supplier
  @ManyToOne(() => Supplier, (supplier) => supplier.product_sources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @ManyToOne(() => Business, (business) => business.product_sources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @ManyToOne(() => Product, (product) => product.sources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @CreateDateColumn()
  created_at!: Date;
}
