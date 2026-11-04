import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDto } from './create-purchase_order.dto';
import { PurchaseOrderStatus } from '../entities/purchase_order.entity';

export class UpdatePurchaseOrderDto extends PartialType(
  CreatePurchaseOrderDto,
) {
  supplier_id?: string | null;
  status?: PurchaseOrderStatus;
}
