import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsUUID,
  Min,
  IsString,
  Matches,
} from 'class-validator';
import {
  StockMovementDirection,
  StockMovementType,
} from '../entities/stock_movement.entity';

export class CreateStockMovementDto {
  @IsUUID()
  @IsNotEmpty()
  product_id!: string;

  @IsUUID()
  @IsNotEmpty()
  supplier_id!: string;

  @IsEnum(StockMovementType, {
    message:
      'Invalid stock movement type. Must be one of: RECEIPT, SALE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, RETURN_IN, RETURN_OUT, DAMAGE, LOSS, REVERSAL.',
  })
  type!: StockMovementType;

  @IsEnum(StockMovementDirection, {
    message: 'Direction must be either IN or OUT.',
  })
  direction!: StockMovementDirection;

  @IsNumber()
  @Min(1, {
    message: 'Quantity must be at least 1.',
  })
  @Type(() => Number)
  quantity!: number;

  @IsNumber()
  @Min(1, {
    message: 'Quantity After must be at least 1.',
  })
  @Type(() => Number)
  quantity_after!: number;

  @IsNumber()
  @Min(1, {
    message: 'Quantity Before must be at least 1.',
  })
  @Type(() => Number)
  quantity_before!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/)
  unit_cost_price!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)?$/)
  unit_selling_price?: string;
}
