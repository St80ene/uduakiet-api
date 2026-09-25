import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  UomBaseName,
  UomDisplayName,
  UomType,
} from '../entities/product.entity';

import { IsValidUom } from '../../../common/validators/uom.validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required.' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'Selling price must be a valid number with at most 2 decimals.',
    },
  )
  @Min(0.01, {
    message: 'Selling price must be greater than 0.',
  })
  @Type(() => Number)
  selling_price!: number;

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
  cost_price!: number;

  @IsNumber(
    { maxDecimalPlaces: 0 },
    {
      message: 'Default reorder point must be a valid integer (whole number).',
    },
  )
  @Min(0, {
    message: 'Default reorder point cannot be negative.',
  })
  @Type(() => Number)
  default_reorder_point!: number;

  @IsEnum(UomType, {
    message: 'uom_type must be one of: UNIT, WEIGHT, VOLUME.',
  })
  uom_type!: UomType;

  @IsEnum(UomBaseName, {
    message: 'uom_base_name must be one of: pcs, g, ml.',
  })
  uom_base_name!: UomBaseName;

  @IsEnum(UomDisplayName, {
    message: 'uom_display_name must be one of: pcs, kg, L, ml.',
  })
  @IsValidUom({
    message:
      'Invalid UOM combination. UNIT must use pcs. WEIGHT must use g with g/kg. VOLUME must use ml with ml/L.',
  })
  uom_display_name!: UomDisplayName;
}
