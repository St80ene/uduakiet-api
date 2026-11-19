import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserRole } from '../../common/enum/user_role.enum';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRolePermissions } from '../../auth/decorators/role_permission.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.DASHBOARD_WAREHOUSE_VIEW])
  @Get()
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getDashboard(user);
  }
}
