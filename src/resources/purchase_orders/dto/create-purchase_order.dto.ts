import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '../entities/purchase_order.entity';

export class CreatePoItemDto {
  @IsString()
  @IsNotEmpty()
  product_id!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity_requested?: number; // e.g., 1500 for 1.5kg

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity_received?: number; // e.g., 1500 for 1.5kg

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimated_unit_cost?: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  status?: PurchaseOrderStatus;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.0, { message: 'Total estmated cost cannot be negative.' })
  @Type(() => Number)
  total_estimated_cost!: number;

  @IsOptional()
  @IsString()
  created_by_id?: string;

  @IsString()
  @IsNotEmpty()
  supplier_id!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePoItemDto)
  items!: CreatePoItemDto[];
}
