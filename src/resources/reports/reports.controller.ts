import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ReportsService } from './reports.service';

import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../common/enum/user_role.enum';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

// Import your query DTOs from their actual locations.
// import { InventoryReportQueryDto } from './dto/inventory-report-query.dto';
// import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
// import { PurchaseOrderReportQueryDto } from './dto/purchase-order-report-query.dto';
// import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('reports')
@UseGuards(RolesGuard)
@Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Dashboard
   * GET /reports/dashboard
   */
  @Get('dashboard')
  getDashboardMetrics(
    @CurrentUser() { businessId, storeId }: AuthenticatedUser,
  ) {
    return this.reportsService.getDashboardMetrics(businessId, storeId);
  }

  /**
   * Inventory overview
   * GET /reports/inventory/overview
   */
  @Get('inventory/overview')
  getInventoryOverview(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Query() query,
  ) {
    return this.reportsService.getInventoryOverview(businessId, query);
  }

  /**
   * Low-stock and out-of-stock products
   * GET /reports/inventory/stock-attention
   */
  @Get('inventory/stock-attention')
  getStockAttentionReport(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Query() query,
  ) {
    return this.reportsService.getStockAttentionReport(businessId, query);
  }

  /**
   * Detailed stock movement history
   * GET /reports/inventory/stock-movements
   */
  @Get('inventory/stock-movements')
  getStockMovementReport(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Query() query,
  ) {
    return this.reportsService.getStockMovementReport(businessId, query);
  }

  /**
   * Purchase order overview
   * GET /reports/procurement/overview
   */
  @Get('procurement/overview')
  getPurchaseOrderOverview(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Query() query,
  ) {
    return this.reportsService.getPurchaseOrderOverview(businessId, query);
  }

  /**
   * Inventory trends
   * GET /reports/analytics/inventory-trends
   */
  @Get('analytics/inventory-trends')
  getInventoryTrends(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Query() query,
  ) {
    return this.reportsService.getInventoryTrends(businessId, query);
  }

  /**
   * Procurement trends
   * GET /reports/analytics/procurement-trends
   */
  @Get('analytics/procurement-trends')
  getProcurementTrends(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Query() query,
  ) {
    return this.reportsService.getProcurementTrends(businessId, query);
  }
}
