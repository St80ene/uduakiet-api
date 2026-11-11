import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';

import { CreatePurchaseOrderDto } from './create-purchase_order.dto';
import { NormalizeString } from '../../../common/utils/helpers/formatters';

// Update only the items of a draft purchase order.
// Status and supplier are managed by the backend workflow.
export class UpdatePurchaseOrderDto extends PartialType(
  CreatePurchaseOrderDto,
) {}

// Receive purchase order
export class ReceivePurchaseOrderItemDto {
  @IsUUID()
  item_id!: string;

  @IsInt()
  @Min(1)
  quantity_received!: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items!: ReceivePurchaseOrderItemDto[];
}

// Shared reason validation
class PurchaseOrderReasonDto {
  @NormalizeString()
  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Reason must be at least 5 characters long.',
  })
  reason!: string;
}

// Cancel purchase order
export class CancelPurchaseOrderDto extends PurchaseOrderReasonDto {
  @IsOptional()
  @IsBoolean()
  supplier_cancellation_confirmed?: boolean;
}

// Reject purchase order
export class RejectPurchaseOrderDto extends PurchaseOrderReasonDto {}
