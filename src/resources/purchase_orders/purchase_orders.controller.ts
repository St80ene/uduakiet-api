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

import {
  CancelPurchaseOrderDto,
  ReceivePurchaseOrderDto,
  RejectPurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/update-purchase_order.dto';

import { PurchaseOrdersService } from './purchase_orders.service';

import {
  PaginationMeta,
  PurchaseOrderPaginationQueryDto,
} from '../../common/dto/pagination-query.dto';

import { type AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import {
  PurchaseOrder,
  PurchaseOrderRawRow,
} from './entities/purchase_order.entity';

import { ApiResponse } from '../../common/utils/response.utils';

import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRolePermissions } from '../../auth/decorators/role_permission.decorator';

import { UserPermission } from '../../common/enum/user_permission.enum';
import { UserRole } from '../../common/enum/user_role.enum';

const { ADMIN, SUPER_ADMIN, STOREMAN, MANAGER } = UserRole;

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  // ============================================================
  // CREATE PURCHASE ORDER
  // Storeman initiates procurement.
  // ============================================================

  @Post()
  @Roles([STOREMAN])
  @UserRolePermissions([UserPermission.PURCHASE_CREATE])
  create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @CurrentUser()
    { id, businessId, storeId }: AuthenticatedUser,
  ): Promise<ApiResponse<null>> {
    return this.poService.create(
      createPurchaseOrderDto,
      id,
      businessId,
      storeId!,
    );
  }

  // ============================================================
  // READ ALL PURCHASE ORDERS
  // ============================================================

  @Get()
  @Roles([ADMIN, MANAGER, SUPER_ADMIN, STOREMAN])
  @UserRolePermissions([UserPermission.PURCHASE_READ])
  findAll(
    @Query() paginationQuery: PurchaseOrderPaginationQueryDto,
    @CurrentUser()
    { businessId, storeId }: AuthenticatedUser,
  ): Promise<
    ApiResponse<{
      purchase_orders: PurchaseOrderRawRow[];
      meta: PaginationMeta;
    }>
  > {
    return this.poService.findAll(businessId, paginationQuery, storeId);
  }

  // ============================================================
  // READ SINGLE PURCHASE ORDER
  // ============================================================

  @Get(':id')
  @Roles([ADMIN, MANAGER, SUPER_ADMIN, STOREMAN])
  @UserRolePermissions([UserPermission.PURCHASE_READ])
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, storeId }: AuthenticatedUser,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.poService.findOne(id, businessId, storeId);
  }

  // ============================================================
  // UPDATE DRAFT PURCHASE ORDER
  // ============================================================

  @Patch(':id')
  @Roles([MANAGER, STOREMAN])
  @UserRolePermissions([UserPermission.PURCHASE_UPDATE])
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, storeId }: AuthenticatedUser,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.poService.update(
      id,
      updatePurchaseOrderDto,
      businessId,
      storeId,
    );
  }

  // ============================================================
  // RECEIVE PURCHASE ORDER
  // Storeman or Manager verifies delivered goods.
  // ============================================================

  @Post(':id/receive')
  @Roles([STOREMAN, MANAGER])
  @UserRolePermissions([UserPermission.PURCHASE_RECEIVE])
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser()
    { businessId, storeId, id: receivedById }: AuthenticatedUser,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.poService.receive(id, dto, businessId, receivedById, storeId);
  }

  // ============================================================
  // DELETE DRAFT PURCHASE ORDER
  // ============================================================

  @Delete(':id')
  @Roles([STOREMAN, MANAGER])
  @UserRolePermissions([UserPermission.PURCHASE_DELETE])
  remove_draft(
    @CurrentUser()
    { businessId }: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    return this.poService.remove_draft(id, businessId);
  }

  // ============================================================
  // SUBMIT FOR APPROVAL
  // Storeman submits completed draft for managerial review.
  // ============================================================

  @Post(':id/submit-for-approval')
  @Roles([STOREMAN])
  @UserRolePermissions([UserPermission.PURCHASE_SUBMIT])
  submitForApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, id: submittedById }: AuthenticatedUser,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.poService.submitForApproval(id, businessId, submittedById);
  }

  // ============================================================
  // APPROVE PURCHASE ORDER
  // Manager or business authority approves procurement.
  // ============================================================

  @Patch(':id/approve')
  @Roles([ADMIN, SUPER_ADMIN, MANAGER])
  @UserRolePermissions([UserPermission.PURCHASE_APPROVE])
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, id: approvedById }: AuthenticatedUser,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.poService.approve(id, businessId, approvedById);
  }

  // ============================================================
  // MARK AS SENT TO SUPPLIER
  // Only management can authorize supplier dispatch.
  // ============================================================

  @Patch(':id/mark-as-sent-to-supplier')
  @Roles([ADMIN, SUPER_ADMIN, MANAGER])
  @UserRolePermissions([UserPermission.PURCHASE_SEND])
  markAsSentToSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, id: sentById }: AuthenticatedUser,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.poService.markAsSentToSupplier(id, businessId, sentById);
  }

  // ============================================================
  // REJECT PURCHASE ORDER
  // ============================================================

  @Patch(':id/reject')
  @Roles([ADMIN, SUPER_ADMIN, MANAGER])
  @UserRolePermissions([UserPermission.PURCHASE_REJECT])
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, id: rejectedById }: AuthenticatedUser,
    @Body() payload: RejectPurchaseOrderDto,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.poService.reject(id, businessId, rejectedById, payload.reason);
  }

  // ============================================================
  // CANCEL PURCHASE ORDER
  // ============================================================

  @Patch(':id/cancel')
  @Roles([ADMIN, SUPER_ADMIN, MANAGER])
  @UserRolePermissions([UserPermission.PURCHASE_CANCEL])
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    { businessId, id: cancelledById }: AuthenticatedUser,
    @Body()
    { reason, supplier_cancellation_confirmed }: CancelPurchaseOrderDto,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.poService.cancel(
      id,
      businessId,
      cancelledById,
      reason,
      supplier_cancellation_confirmed,
    );
  }
}
