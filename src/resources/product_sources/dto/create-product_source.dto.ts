import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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
  @Type(() => Number)
  estimated_lead_time_days?: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'Cost price must be a valid number with at most 2 decimals.',
    },
  )
  @Min(0, {
    message: 'Cost price cannot be negative.',
  })
  @Type(() => Number)
  cost_price!: number; // Wholesaler cost price (moves dynamically per supplier)
}
