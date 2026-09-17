import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Product } from '../../products/entities/product.entity';

@Entity({ name: 'product_sources' })
export class ProductSource {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  product_id!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  supplier_id!: string;

  // Relation: Many product sources can belong to one supplier
  @ManyToOne(() => Supplier, (supplier) => supplier.productSources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  // Bidirectional link: Let's us do: productRepository.find({ relations: { source: true } })
  @OneToOne(() => Product, (product) => product.source)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @CreateDateColumn()
  created_at!: Date;
}
