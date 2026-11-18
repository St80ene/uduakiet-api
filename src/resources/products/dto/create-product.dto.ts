import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
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

  @IsString()
  @IsOptional()
  sku?: string;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/)
  selling_price!: string;

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
