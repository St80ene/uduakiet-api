import { Injectable } from '@nestjs/common';

import { ProductsService } from '../products/products.service';
import { PurchaseOrdersService } from '../purchase_orders/purchase_orders.service';
import { StocksService } from '../stocks/stock.service';

import { DashboardSection } from './interfaces/initial_interface';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';

type WarehouseDashboardSection = DashboardSection & {
  stock_by_unit: Awaited<ReturnType<StocksService['getTotalStockByUnit']>>;
};

export interface DashboardResponse {
  inventory: DashboardSection;
  procurement: DashboardSection;
  warehouse: WarehouseDashboardSection;
}

/**
 * DashboardService
 *
 * Responsible for aggregating dashboard sections and coordinating
 * dashboard data from the respective domain services.
 *
 * Inventory:
 * - Active products
 * - Healthy products
 * - Low-stock products
 * - Out-of-stock products
 * - Inventory health rate
 *
 * Procurement:
 * - Open purchase orders
 * - Awaiting approval
 * - Awaiting delivery
 * - Partially received
 * - Completed this month
 *
 * Warehouse:
 * - Stock receipts
 * - Stock issuances
 * - Stock adjustments
 * - Total stock movements
 * - Physical stock grouped by unit of measurement
 *
 * All metrics must be scoped to the authenticated business.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly stocksService: StocksService,
  ) {}

  /**
   * Returns the complete dashboard overview.
   *
   * @param user Authenticated user
   * @param storeId Optional store filter
   */
  async getDashboard(
    user: AuthenticatedUser,
  ): Promise<ApiResponse<DashboardResponse>> {
    const [inventory, procurement, warehouse] = await Promise.all([
      this.getInventoryHealth(user),
      this.getProcurementPipeline(user),
      this.getWarehouseOperations(user),
    ]);

    return successResponse('Dashboard metrics retrieved successfully', {
      inventory,
      procurement,
      warehouse,
    });
  }

  /**
   * Inventory health overview.
   */
  async getInventoryHealth(user: AuthenticatedUser): Promise<DashboardSection> {
    const cards = await this.productsService.getInventoryHealth(user);

    return {
      title: 'Inventory Health',
      cards,
    };
  }

  /**
   * Procurement pipeline overview.
   */
  async getProcurementPipeline(
    user: AuthenticatedUser,
  ): Promise<DashboardSection> {
    const cards =
      await this.purchaseOrdersService.getPurchaseOrderPipeline(user);

    return {
      title: 'Procurement Pipeline',
      cards,
    };
  }

  /**
   * Warehouse operations overview.
   *
   * Fetches movement metrics and physical stock grouped by UOM.
   */
  async getWarehouseOperations(
    user: AuthenticatedUser,
  ): Promise<WarehouseDashboardSection> {
    const [cards, stockByUnit] = await Promise.all([
      this.stocksService.getWarehouseMetrics(user),
      this.stocksService.getTotalStockByUnit(user),
    ]);

    return {
      title: 'Warehouse Operations',
      cards,
      stock_by_unit: stockByUnit,
    };
  }
}
