import { Type } from 'class-transformer';
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
import {
  StockMovementDirection,
  StockMovementType,
} from '../../stock_movements/entities/stock_movement.entity';
import { NormalizeString } from '../../../common/utils/helpers/formatters';

export enum MutationType {
  INFLOW = 'INFLOW',
  OUTFLOW = 'OUTFLOW',
}

export class CreateStockDto {
  @IsUUID(4)
  product_id!: string;

  @IsEnum(StockMovementType, {
    message: 'Type must be a valid StockMovementReferenceType.',
  })
  movement_type!: StockMovementType; // 'INFLOW' or 'OUTFLOW'

  @IsEnum(StockMovementDirection, {
    message: 'Direction must be a valid StockMovementDirection.',
  })
  direction!: StockMovementDirection;

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
  initial_quantity!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/)
  unit_selling_price!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/)
  unit_cost_price!: string; // this should be gotten from the purchase order items table.(column unit_cost_price) when the stock is created from a purchase order.

  @IsOptional()
  @NormalizeString()
  reason?: string;

  @IsString()
  @Matches(/^\d+$/)
  initial_unit_cost!: string;
}
