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
import { UserRole } from '../../common/enum/user_role.enum';
import { ReceivePurchaseOrderDto } from './entities/purchase_order_item.entity';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRolePermissions } from '../../auth/decorators/role_permission.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
const { ADMIN, SUPER_ADMIN, STOREMAN, MANAGER } = UserRole;

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  @Roles([ADMIN, SUPER_ADMIN, STOREMAN, MANAGER]) // Only these roles can create
  @UserRolePermissions([UserPermission.PURCHASE_CREATE])
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
  @Roles([ADMIN, MANAGER, SUPER_ADMIN, STOREMAN]) // Broad read access
  @UserRolePermissions([UserPermission.PURCHASE_READ])
  findAll(
    @Query() paginationQuery: PurchaseOrderPaginationQueryDto,
    @CurrentUser() { businessId, storeId }: AuthenticatedUser,
  ) {
    return this.poService.findAll(businessId, paginationQuery, storeId);
  }

  @Get(':id')
  @Roles([ADMIN, MANAGER, SUPER_ADMIN, STOREMAN])
  @UserRolePermissions([UserPermission.PURCHASE_READ])
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() { businessId, storeId }: AuthenticatedUser,
  ) {
    return this.poService.findOne(id, businessId, storeId);
  }

  @Patch(':id')
  @Roles([ADMIN, SUPER_ADMIN, MANAGER]) // Only higher management can update
  @UserRolePermissions([UserPermission.PURCHASE_UPDATE])
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

  @Roles([STOREMAN]) // Only these roles can receive
  @Post(':id/receive')
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() { businessId, storeId, id: receivedById }: AuthenticatedUser,
  ) {
    return this.poService.receive(id, dto, receivedById, businessId, storeId);
  }

  @Delete(':id')
  @Roles([UserRole.SUPER_ADMIN, UserRole.STOREMAN, UserRole.MANAGER]) // Destructive action restricted to Super Admin
  @UserRolePermissions([UserPermission.PURCHASE_DELETE])
  remove_draft(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.poService.remove_draft(id, businessId);
  }
}
