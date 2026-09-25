import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { IsEnum } from 'class-validator';

import { ProductSource } from '../../product_sources/entities/product_source.entity';
import { Stock } from '../../stocks/entities/stock.entity';
import { Category } from '../../categories/entities/category.entity';
import { Business } from '../../business/entities/business.entity';
import { CloudinaryImage } from '../../../common/utils/helpers/cloudinary/cloudinary.service';

export enum UomType {
  UNIT = 'UNIT',
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
}

export enum UomBaseName {
  PCS = 'pcs',
  G = 'g',
  ML = 'ml',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum UomDisplayName {
  PCS = 'pcs',
  G = 'g',
  KG = 'kg',
  ML = 'ml',
  L = 'L',
}

@Entity({ name: 'products' })
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({
    type: 'json',
    default: () => "('[]')",
  })
  images!: CloudinaryImage[];

  /**
   * Current/default product cost.
   *
   * This represents the product's current master pricing,
   * not the historical cost of a stock transaction.
   */
  @Column('decimal', {
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  cost_price!: number;

  /**
   * Current/default selling price.
   */
  @Column('decimal', {
    precision: 12,
    scale: 2,
  })
  selling_price!: number;

  /**
   * Quantity at or below which the product is considered low stock
   * for the business.
   */
  @Column({ type: 'int', default: 5 })
  default_reorder_point?: number;

  @IsEnum(UomType, {
    message: 'Invalid UOM type. Must be one of: UNIT, WEIGHT, VOLUME.',
  })
  @Column({
    type: 'varchar',
    length: 20,
    default: UomType.UNIT,
  })
  uom_type!: UomType;

  @IsEnum(UomBaseName, {
    message: 'Invalid UOM base name. Must be one of: pcs, g, ml.',
  })
  @Column({
    type: 'varchar',
    length: 10,
    default: UomBaseName.PCS,
  })
  uom_base_name!: UomBaseName;

  @IsEnum(UomDisplayName, {
    message: 'Invalid UOM display name. Must be one of: pcs, g, kg, ml, L.',
  })
  @Column({
    type: 'varchar',
    length: 10,
    default: UomDisplayName.PCS,
  })
  uom_display_name!: UomDisplayName;

  @IsEnum(ProductStatus, {
    message:
      'Invalid product status. Must be one of: ACTIVE, INACTIVE, ARCHIVED.',
  })
  @Column({
    type: 'varchar',
    default: ProductStatus.INACTIVE,
  })
  status!: ProductStatus;

  @OneToOne(() => ProductSource, (source) => source.product)
  source!: ProductSource;

  @OneToMany(() => Stock, (stock) => stock.product)
  stocks!: Stock[];

  @Column({
    type: 'char',
    length: 36,
    nullable: true,
  })
  category_id!: string | null;

  @Column({
    type: 'char',
    length: 36,
    nullable: false,
  })
  business_id!: string;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @ManyToOne(() => Business, (business) => business.products, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  @DeleteDateColumn({
    type: 'datetime',
    nullable: true,
  })
  deleted_at!: Date | null;
}
