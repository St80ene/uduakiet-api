import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export type CreatePurchaseOrderDtoType = CreatePoItemDto & {
  estimated_unit_cost: number;
};
export class CreatePoItemDto {
  @IsString()
  @IsNotEmpty()
  product_id!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity_requested!: number; // e.g., 1500 for 1.5kg
}

export class CreatePurchaseOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePoItemDto)
  items!: CreatePoItemDto[];
}
