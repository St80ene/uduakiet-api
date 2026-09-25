import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { NormalizeString } from '../../../common/utils/helpers/formatters';

export class UpdateStockDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Current quantity must be a valid number with at most 2 decimals.',
    },
  )
  @Min(0, {
    message: 'Current quantity cannot be negative.',
  })
  @Type(() => Number)
  physical_quantity!: number;

  @IsUUID(4)
  product_id!: string;

  @IsOptional()
  @NormalizeString()
  reason?: string;
}
