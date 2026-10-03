import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserRole } from '../../common/enum/user_role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('dashboard')
@UseGuards(RolesGuard) // Apply the RolesGuard to all routes in this controller
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Post('inventory-health')
  getInventoryHealth(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getInventoryHealth(user);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Get('procurement-pipeline')
  getProcurementPipeline() {
    return this.dashboardService.getProcurementPipeline();
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Get('warehouse-operations')
  getWarehouseOperations(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getWarehouseOperations(user);
  }
}
