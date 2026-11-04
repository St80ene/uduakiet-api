import { Controller, Get, Param, Query } from '@nestjs/common';

import { StockMovementsService } from './stock_movements.service';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { StockMovementPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRolePermissions } from '../../auth/decorators/role_permission.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  /**
   * Get all stock movements for the authenticated business.
   *
   * GET /stock-movements
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.STOCK_MOVEMENT_READ])
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StockMovementPaginationQueryDto,
  ) {
    return this.stockMovementsService.findAll(user, query);
  }

  /**
   * Get one stock movement.
   *
   * GET /stock-movements/:id
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.STOCK_MOVEMENT_READ])
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.stockMovementsService.findOne(id, user);
  }

  /**
   * Get all movements belonging to a stock balance.
   *
   * GET /stock-movements/stock/:stockId
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.STOCK_MOVEMENT_READ])
  @Get('stock/:stockId')
  findByStock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('stockId') stockId: string,
  ) {
    return this.stockMovementsService.findByStock(stockId, user);
  }

  /**
   * Get all movements for a product.
   *
   * GET /stock-movements/product/:productId
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.STOCK_MOVEMENT_READ])
  @Get('product/:productId')
  findByProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.stockMovementsService.findByProduct(productId, user);
  }
}
