import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
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

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Unot Selling price must be a valid number with at most 2 decimals.',
    },
  )
  @Min(0, {
    message: 'Unit Selling price cannot be negative.',
  })
  @Type(() => Number)
  unit_selling_price!: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Unit Cost price must be a valid number with at most 2 decimals.',
    },
  )
  @Min(0, {
    message: 'Unit Cost price cannot be negative.',
  })
  @Type(() => Number)
  unit_cost_price!: number;

  @IsOptional()
  @NormalizeString()
  reason?: string;
}
