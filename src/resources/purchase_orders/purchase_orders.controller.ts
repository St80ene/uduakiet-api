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

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  create(@Body() createPurchaseOrderDto: CreatePurchaseOrderDto) {
    // Hardcoded mock user ID here; replace with your auth decoration (e.g., req.user.id)
    const mockAdminId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    return this.poService.create(createPurchaseOrderDto, mockAdminId);
  }

  @Get()
  findAll(@Query() paginationQuery: PurchaseOrderPaginationQueryDto) {
    return this.poService.findAll(paginationQuery);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.poService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ) {
    return this.poService.update(id, updatePurchaseOrderDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.poService.remove(id);
  }
}
