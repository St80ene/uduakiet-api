import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { PurchaseOrdersService } from '../purchase_orders/purchase_orders.service';
import { StocksService } from '../stocks/stock.service';
import { DashboardSection } from './interfaces/initial_interface';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

/**
 * This Service should be able to answer quotation that
 * pertain to decision making, using historical data required of a domain and the system.
 * It should tell a top executive,why we have certain data,
 * what we currently have, how we got here,
 * what is the context both past and present,
 * what information does this context offer,
 * what does it affect,
 * what opportunities do we have,
 * and how can we use this to come to a decision,
 * what decision would that be, what results are we looking,
 * how can we act and it and have results.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly stocksService: StocksService,
  ) {}

  async getDashboard(user: AuthenticatedUser): Promise<{
    inventory: DashboardSection;
    procurement: DashboardSection;
    warehouse: DashboardSection;
  }> {
    const [inventory, procurement, warehouse] = await Promise.all([
      this.getInventoryHealth(user),
      this.getProcurementPipeline(),
      this.getWarehouseOperations(user),
    ]);

    return {
      inventory,
      procurement,
      warehouse,
    };
  }

  async getInventoryHealth(user: AuthenticatedUser): Promise<DashboardSection> {
    return {
      title: 'Inventory Health',
      cards: await this.productsService.getInventoryHealth(user),
    };
  }

  async getProcurementPipeline(): Promise<DashboardSection> {
    return {
      title: 'Procurement Pipeline',
      cards: await this.purchaseOrdersService.getPurchaseOrderPipeline(),
    };
  }

  async getWarehouseOperations(
    user: AuthenticatedUser,
  ): Promise<DashboardSection> {
    return {
      title: 'Warehouse Operations',
      cards: await this.stocksService.getWarehouseMetrics(user),
    };
  }
}
