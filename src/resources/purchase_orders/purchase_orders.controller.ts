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
  UseGuards,
} from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase_order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase_order.dto';
import { PurchaseOrdersService } from './purchase_orders.service';
import { PurchaseOrderPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { type AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('purchase-orders')
@UseGuards(RolesGuard) // Checks roles for every route inside this controller
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STOREMAN]) // Only these roles can create
  create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @CurrentUser() { id, businessId, storeId }: AuthenticatedUser,
  ) {
    return this.poService.create(
      createPurchaseOrderDto,
      id,
      businessId,
      storeId,
    );
  }

  @Get()
  @Roles([
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.STOREMAN,
  ]) // Broad read access
  findAll(
    @Query() paginationQuery: PurchaseOrderPaginationQueryDto,
    @CurrentUser() { businessId, storeId }: AuthenticatedUser,
  ) {
    return this.poService.findAll(businessId, paginationQuery, storeId);
  }

  @Get(':id')
  @Roles([
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.STOREMAN,
  ])
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() { businessId, storeId }: AuthenticatedUser,
  ) {
    return this.poService.findOne(id, businessId, storeId);
  }

  @Patch(':id')
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN]) // Only higher management can update
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() { businessId, storeId }: AuthenticatedUser,
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
  @Roles([UserRole.SUPER_ADMIN]) // Destructive action restricted to Super Admin
  remove(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.remove(id, businessId);
  }
}
