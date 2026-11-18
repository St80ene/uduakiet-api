import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateProductSourceDto {
  @IsNotEmpty({ message: 'Product id is required.' })
  @IsString()
  product_id!: string;

  @IsNotEmpty({ message: 'Supplier id is required.' })
  @IsString()
  supplier_id!: string;

  @IsOptional()
  @IsString()
  supplier_sku?: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @Type(() => Number)
  estimated_lead_time_days?: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/)
  cost_price!: string; // Wholesaler cost price (moves dynamically per supplier)
}
