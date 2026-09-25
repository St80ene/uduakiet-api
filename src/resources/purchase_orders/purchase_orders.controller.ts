import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase_order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase_order.dto';
import { PurchaseOrdersService } from './purchase_orders.service';
import { PurchaseOrderPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { type AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @CurrentUser()
    { id, businessId, storeId }: AuthenticatedUser,
  ) {
    return this.poService.create(
      createPurchaseOrderDto,
      id,
      businessId,
      storeId,
    );
  }

  @Get()
  findAll(
    @Query() paginationQuery: PurchaseOrderPaginationQueryDto,
    @CurrentUser()
    { businessId, storeId }: AuthenticatedUser,
  ) {
    return this.poService.findAll(businessId, paginationQuery, storeId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, storeId }: AuthenticatedUser,
  ) {
    return this.poService.findOne(id, businessId, storeId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, storeId }: AuthenticatedUser,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ) {
    return this.poService.update(
      id,
      updatePurchaseOrderDto,
      businessId,
      storeId,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser()
    { businessId }: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.remove(id, businessId);
  }
}
