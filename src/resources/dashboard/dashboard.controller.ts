import { Controller, Get, Post } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserRole } from '../../common/enum/user_role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';
import { UserPermission } from '../../common/enum/user_permission.enum';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.DASHBOARD_INVENTORY_VIEW])
  @Post('inventory-health')
  getInventoryHealth(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getInventoryHealth(user);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.DASHBOARD_PROCUREMENT_VIEW])
  @Get('procurement-pipeline')
  getProcurementPipeline() {
    return this.dashboardService.getProcurementPipeline();
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.DASHBOARD_WAREHOUSE_VIEW])
  @Get('warehouse-operations')
  getWarehouseOperations(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getWarehouseOperations(user);
  }
}
