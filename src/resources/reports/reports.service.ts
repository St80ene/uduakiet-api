import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Product } from '../products/entities/product.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { StockMovement } from '../stock_movements/entities/stock_movement.entity';
import { PurchaseOrder } from '../purchase_orders/entities/purchase_order.entity';

import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

interface DashboardInventoryRaw {
  total_products: string | number | null;
  total_stock: string | number | null;
  low_stock: string | number | null;
  out_of_stock: string | number | null;
}

interface DashboardProcurementRaw {
  total_orders: string | number | null;
  pending_approval: string | number | null;
  outstanding_orders: string | number | null;
}

/**
 * Shared query options.
 */
export interface ReportQuery {
  page?: number;
  limit?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  store_id?: string;
  category_id?: string;
  supplier_id?: string;
  status?: string;
  interval?: 'day' | 'week' | 'month';
  movement_type?: string;
  direction?: string;
  overdue?: boolean;
}

interface InventoryOverviewRaw {
  product_id: string;
  product_name: string;
  sku: string;
  category_id: string | null;
  reorder_point: number | string | null;
  current_quantity: number | string | null;
}

interface PurchaseOrderStatusRaw {
  status: string;
  count: string | number;
}

interface PurchaseOrderOverviewRaw {
  purchase_order_id: string;
  po_number: string;
  status: string;
  total_estimated_cost: string | number | null;
  created_at: Date | string;
  supplier_id: string | null;
  supplier_name: string | null;
  store_id: string | null;
  store_name: string | null;
  items_count: string | number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,

    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,

    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
  ) {}

  /**
   * ============================================================
   * SHARED HELPERS
   * ============================================================
   */

  private getPagination(query: ReportQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  private getPaginationMeta(
    totalItems: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      totalItems,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  private applyDateFilters(
    qb: SelectQueryBuilder<any>,
    alias: string,
    query: ReportQuery,
  ) {
    if (query.start_date) {
      qb.andWhere(`${alias}.created_at >= :startDate`, {
        startDate: query.start_date,
      });
    }

    if (query.end_date) {
      qb.andWhere(`${alias}.created_at < DATE_ADD(:endDate, INTERVAL 1 DAY)`, {
        endDate: query.end_date,
      });
    }

    return qb;
  }

  private getDateBucket(alias: string, interval: string): string {
    const driver = this.stockRepository.manager.connection.options.type;

    if (driver === 'better-sqlite3' || driver === 'mysql') {
      switch (interval) {
        case 'day':
          return `DATE(${alias}.created_at)`;
        case 'week':
          return `strftime('%Y-%W', ${alias}.created_at)`;
        default:
          return `strftime('%Y-%m', ${alias}.created_at)`;
      }
    }

    switch (interval) {
      case 'day':
        return `DATE(${alias}.created_at)`;
      case 'week':
        return `YEARWEEK(${alias}.created_at, 3)`;
      default:
        return `DATE_FORMAT(${alias}.created_at, '%Y-%m')`;
    }
  }

  /**
   * ============================================================
   * 1. DASHBOARD
   * ============================================================
   *
   * High-level business snapshot.
   * Does not return detailed report records.
   */

  async getDashboardMetrics(businessId: string, storeId?: string) {
    const stockQuery = this.stockRepository
      .createQueryBuilder('stock')
      .innerJoin(
        Product,
        'product',
        'product.id = stock.product_id AND product.business_id = stock.business_id',
      )
      .where('stock.business_id = :businessId', { businessId })
      .andWhere('product.deleted_at IS NULL');

    if (storeId) {
      stockQuery.andWhere('stock.store_id = :storeId', { storeId });
    }

    const [inventory, purchaseOrders] = await Promise.all([
      stockQuery
        .clone()
        .select('COUNT(DISTINCT product.id)', 'total_products')
        .addSelect('COALESCE(SUM(stock.current_quantity), 0)', 'total_stock')
        .addSelect(
          `SUM(
        CASE
          WHEN stock.current_quantity > 0
          AND stock.current_quantity <= COALESCE(product.default_reorder_point, 5)
          THEN 1 ELSE 0
        END
      )`,
          'low_stock',
        )
        .addSelect(
          `SUM(
        CASE
          WHEN stock.current_quantity <= 0
          THEN 1 ELSE 0
        END
      )`,
          'out_of_stock',
        )
        .getRawOne<DashboardInventoryRaw>(),

      this.purchaseOrderRepository
        .createQueryBuilder('po')
        .where('po.business_id = :businessId', { businessId })
        .andWhere(storeId ? 'po.store_id = :storeId' : '1=1', {
          storeId,
        })
        .select('COUNT(po.id)', 'total_orders')
        .addSelect(
          `SUM(CASE WHEN po.status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END)`,
          'pending_approval',
        )
        .addSelect(
          `SUM(
        CASE
          WHEN po.status IN (
            'APPROVED',
            'SENT_TO_SUPPLIER',
            'PARTIALLY_RECEIVED'
          )
          THEN 1 ELSE 0
        END
      )`,
          'outstanding_orders',
        )
        .getRawOne<DashboardProcurementRaw>(),
    ]);

    return successResponse('Dashboard metrics retrieved successfully.', {
      inventory: {
        total_products: Number(inventory?.total_products ?? 0),
        total_stock: Number(inventory?.total_stock ?? 0),
        low_stock: Number(inventory?.low_stock ?? 0),
        out_of_stock: Number(inventory?.out_of_stock ?? 0),
      },
      procurement: {
        total_orders: Number(purchaseOrders?.total_orders ?? 0),
        pending_approval: Number(purchaseOrders?.pending_approval ?? 0),
        outstanding_orders: Number(purchaseOrders?.outstanding_orders ?? 0),
      },
    });
  }

  /**
   * ============================================================
   * 2. INVENTORY OVERVIEW
   * ============================================================
   *
   * Product inventory position across stores.
   */

  async getInventoryOverview(businessId: string, query: ReportQuery) {
    const { page, limit, skip } = this.getPagination(query);

    const stockJoinCondition = `
    stock.product_id = product.id
    AND stock.business_id = product.business_id
    ${query.store_id ? 'AND stock.store_id = :storeId' : ''}
  `;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoin(
        'stocks',
        'stock',
        stockJoinCondition,
        query.store_id ? { storeId: query.store_id } : {},
      )
      .where('product.business_id = :businessId', { businessId })
      .andWhere('product.deleted_at IS NULL')
      .select([
        'product.id AS product_id',
        'product.name AS product_name',
        'product.sku AS sku',
        'product.category_id AS category_id',
        'product.default_reorder_point AS reorder_point',
      ])
      .addSelect('COALESCE(SUM(stock.current_quantity), 0)', 'current_quantity')
      .groupBy('product.id');

    if (query.category_id) {
      qb.andWhere('product.category_id = :categoryId', {
        categoryId: query.category_id,
      });
    }

    if (query.search) {
      qb.andWhere('(product.name LIKE :search OR product.sku LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const countQuery = this.productRepository
      .createQueryBuilder('product')
      .where('product.business_id = :businessId', { businessId })
      .andWhere('product.deleted_at IS NULL');

    if (query.category_id) {
      countQuery.andWhere('product.category_id = :categoryId', {
        categoryId: query.category_id,
      });
    }

    if (query.search) {
      countQuery.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [rows, totalItems] = await Promise.all([
      qb
        .orderBy('product.name', 'ASC')
        .offset(skip)
        .limit(limit)
        .getRawMany<InventoryOverviewRaw>(),

      countQuery.getCount(),
    ]);

    const products = rows.map((row) => {
      const quantity = Number(row.current_quantity ?? 0);
      const reorderPoint = Number(row.reorder_point ?? 5);

      return {
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.sku,
        category_id: row.category_id,
        current_quantity: quantity,
        reorder_point: reorderPoint,
        stock_status:
          quantity <= 0
            ? 'OUT_OF_STOCK'
            : quantity <= reorderPoint
              ? 'LOW_STOCK'
              : 'HEALTHY',
      };
    });

    return successResponse('Inventory overview retrieved successfully.', {
      products,
      meta: this.getPaginationMeta(totalItems, page, limit),
    });
  }

  /**
   * ============================================================
   * 3. STOCK ATTENTION
   * ============================================================
   *
   * Combines low-stock and out-of-stock products.
   */

  async getStockAttentionReport(businessId: string, query: ReportQuery) {
    const { page, limit, skip } = this.getPagination(query);

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoin(
        'stocks',
        'stock',
        `
          stock.product_id = product.id
          AND stock.business_id = product.business_id
          ${query.store_id ? 'AND stock.store_id = :storeId' : ''}
        `,
        query.store_id ? { storeId: query.store_id } : {},
      )
      .where('product.business_id = :businessId', { businessId })
      .andWhere('product.deleted_at IS NULL')
      .select([
        'product.id AS product_id',
        'product.name AS product_name',
        'product.sku AS sku',
        'product.default_reorder_point AS reorder_point',
      ])
      .addSelect('COALESCE(SUM(stock.current_quantity), 0)', 'current_quantity')
      .groupBy('product.id')
      .having(
        `COALESCE(SUM(stock.current_quantity), 0)
         <= COALESCE(product.default_reorder_point, 5)`,
      );

    if (query.search) {
      qb.andWhere('(product.name LIKE :search OR product.sku LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const rows = await qb
      .orderBy('current_quantity', 'ASC')
      .addOrderBy('product.name', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    // Count matching products without loading their records.
    const countRows = await qb
      .clone()
      .offset(undefined)
      .limit(undefined)
      .getRawMany();

    const products = rows.map((row) => {
      const quantity = Number(row.current_quantity);

      return {
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.sku,
        current_quantity: quantity,
        reorder_point: Number(row.reorder_point ?? 5),
        status: quantity <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      };
    });

    return successResponse('Stock attention retrieved successfully.', {
      products,
      summary: {
        total: countRows.length,
        low_stock: countRows.filter((item) => Number(item.current_quantity) > 0)
          .length,
        out_of_stock: countRows.filter(
          (item) => Number(item.current_quantity) <= 0,
        ).length,
      },
      meta: this.getPaginationMeta(countRows.length, page, limit),
    });
  }

  /**
   * ============================================================
   * 4. STOCK MOVEMENT REPORT
   * ============================================================
   *
   * Historical inventory ledger.
   */

  async getStockMovementReport(businessId: string, query: ReportQuery) {
    const { page, limit, skip } = this.getPagination(query);

    const qb = this.stockMovementRepository
      .createQueryBuilder('movement')
      .innerJoin(
        'stocks',
        'stock',
        'stock.id = movement.stock_id AND stock.business_id = movement.business_id',
      )
      .innerJoin(
        'products',
        'product',
        'product.id = stock.product_id AND product.business_id = movement.business_id',
      )
      .leftJoin('stores', 'store', 'store.id = stock.store_id')
      .where('movement.business_id = :businessId', { businessId })
      .select([
        'movement.id AS movement_id',
        'movement.type AS type',
        'movement.direction AS direction',
        'movement.quantity AS quantity',
        'movement.quantity_before AS quantity_before',
        'movement.quantity_after AS quantity_after',
        'movement.reason AS reason',
        'movement.created_at AS created_at',
        'product.id AS product_id',
        'product.name AS product_name',
        'product.sku AS sku',
        'store.id AS store_id',
        'store.name AS store_name',
      ]);

    if (query.store_id) {
      qb.andWhere('stock.store_id = :storeId', {
        storeId: query.store_id,
      });
    }

    if (query.movement_type) {
      qb.andWhere('movement.type = :movementType', {
        movementType: query.movement_type,
      });
    }

    if (query.direction) {
      qb.andWhere('movement.direction = :direction', {
        direction: query.direction,
      });
    }

    if (query.search) {
      qb.andWhere('(product.name LIKE :search OR product.sku LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    this.applyDateFilters(qb, 'movement', query);

    const countQuery = qb.clone();

    const [movements, totalItems, summary] = await Promise.all([
      qb
        .clone()
        .orderBy('movement.created_at', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany(),

      countQuery.getCount(),

      qb
        .clone()
        .select('COUNT(movement.id)', 'total_movements')
        .addSelect(
          `SUM(
            CASE WHEN movement.direction = 'IN'
            THEN movement.quantity ELSE 0 END
          )`,
          'total_in',
        )
        .addSelect(
          `SUM(
            CASE WHEN movement.direction = 'OUT'
            THEN movement.quantity ELSE 0 END
          )`,
          'total_out',
        )
        .getRawOne(),
    ]);

    return successResponse('Stock movement report retrieved successfully.', {
      movements,
      summary: {
        total_movements: Number(summary?.total_movements ?? 0),
        total_in: Number(summary?.total_in ?? 0),
        total_out: Number(summary?.total_out ?? 0),
      },
      meta: this.getPaginationMeta(totalItems, page, limit),
    });
  }

  /**
   * ============================================================
   * 5. PURCHASE ORDER OVERVIEW
   * ============================================================
   *
   * Includes:
   * - Status distribution
   * - Purchase order records
   * - Outstanding order counts
   *
   * Overdue classification is deliberately excluded until
   * expected delivery dates are reliably stored.
   */

  async getPurchaseOrderOverview(businessId: string, query: ReportQuery) {
    const { page, limit, skip } = this.getPagination(query);

    const qb = this.purchaseOrderRepository
      .createQueryBuilder('po')
      .leftJoin('suppliers', 'supplier', 'supplier.id = po.supplier_id')
      .leftJoin('stores', 'store', 'store.id = po.store_id')
      .where('po.business_id = :businessId', { businessId })
      .select([
        'po.id AS purchase_order_id',
        'po.po_number AS po_number',
        'po.status AS status',
        'po.total_estimated_cost AS total_estimated_cost',
        'po.created_at AS created_at',
        'supplier.id AS supplier_id',
        'supplier.name AS supplier_name',
        'store.id AS store_id',
        'store.name AS store_name',
      ])
      .addSelect(
        `(SELECT COUNT(item.id)
        FROM purchase_order_items item
        WHERE item.purchase_order_id = po.id)`,
        'items_count',
      );

    // Store filter
    if (query.store_id) {
      qb.andWhere('po.store_id = :storeId', {
        storeId: query.store_id,
      });
    }

    // Supplier filter
    if (query.supplier_id) {
      qb.andWhere('po.supplier_id = :supplierId', {
        supplierId: query.supplier_id,
      });
    }

    // Status filter
    if (query.status) {
      qb.andWhere('po.status = :status', {
        status: query.status,
      });
    }

    // Search filter
    if (query.search) {
      qb.andWhere('(po.po_number LIKE :search OR supplier.name LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    // Date filters
    this.applyDateFilters(qb, 'po', query);

    // Reuse the filtered query for the status summary.
    // Clear pagination/order-related selection by building a fresh
    // aggregate query from the same filters.
    const statusQuery = qb
      .clone()
      .select('po.status', 'status')
      .addSelect('COUNT(po.id)', 'count')
      .groupBy('po.status');

    const [orders, totalItems, statusRows] = await Promise.all([
      qb
        .clone()
        .orderBy('po.created_at', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany<PurchaseOrderOverviewRaw>(),

      qb.clone().getCount(),

      statusQuery.getRawMany<PurchaseOrderStatusRaw>(),
    ]);

    // Convert grouped status counts into a strongly typed object.
    const statusDistribution: Record<string, number> = Object.fromEntries(
      statusRows.map((row) => [row.status, Number(row.count)]),
    );

    // Orders that have been approved but are not fully received.
    // Verify PARTIALLY_RECEIVED against your actual enum.
    const outstandingStatuses = [
      'APPROVED',
      'SENT_TO_SUPPLIER',
      'PARTIALLY_RECEIVED',
    ];

    const outstandingOrders = outstandingStatuses.reduce(
      (total, status) => total + (statusDistribution[status] ?? 0),
      0,
    );

    const totalOrders = Object.values(statusDistribution).reduce(
      (sum, value) => sum + value,
      0,
    );

    const formattedOrders = orders.map((order) => ({
      ...order,
      items_count: Number(order.items_count ?? 0),
      total_estimated_cost: String(order.total_estimated_cost ?? '0'),
    }));

    return successResponse('Purchase order overview retrieved successfully.', {
      orders: formattedOrders,
      summary: {
        total_orders: totalOrders,
        pending_approval: statusDistribution['PENDING_APPROVAL'] ?? 0,
        outstanding_orders: outstandingOrders,
        status_distribution: statusDistribution,
      },
      meta: this.getPaginationMeta(totalItems, page, limit),
    });
  }

  /**
   * ============================================================
   * 6. INVENTORY TRENDS
   * ============================================================
   *
   * Aggregates historical stock movement activity.
   */

  async getInventoryTrends(businessId: string, query: ReportQuery) {
    const interval = query.interval ?? 'month';

    const bucket = this.getDateBucket('movement', interval);

    const qb = this.stockMovementRepository
      .createQueryBuilder('movement')
      .where('movement.business_id = :businessId', { businessId });

    if (query.store_id) {
      qb.innerJoin('stocks', 'stock', 'stock.id = movement.stock_id').andWhere(
        'stock.store_id = :storeId',
        {
          storeId: query.store_id,
        },
      );
    }

    this.applyDateFilters(qb, 'movement', query);

    const trends = await qb
      .select(bucket, 'period')
      .addSelect(
        `SUM(
          CASE WHEN movement.direction = 'IN'
          THEN movement.quantity ELSE 0 END
        )`,
        'stock_in',
      )
      .addSelect(
        `SUM(
          CASE WHEN movement.direction = 'OUT'
          THEN movement.quantity ELSE 0 END
        )`,
        'stock_out',
      )
      .addSelect('COUNT(movement.id)', 'movement_count')
      .groupBy(bucket)
      .orderBy('period', 'ASC')
      .getRawMany();

    return successResponse('Inventory trends retrieved successfully.', {
      interval,
      trends: trends.map((row) => ({
        period: row.period,
        stock_in: Number(row.stock_in ?? 0),
        stock_out: Number(row.stock_out ?? 0),
        movement_count: Number(row.movement_count ?? 0),
      })),
    });
  }

  /**
   * ============================================================
   * 7. PROCUREMENT TRENDS
   * ============================================================
   *
   * Historical purchase order creation activity.
   */

  async getProcurementTrends(businessId: string, query: ReportQuery) {
    const interval = query.interval ?? 'month';

    const bucket = this.getDateBucket('po', interval);

    const qb = this.purchaseOrderRepository
      .createQueryBuilder('po')
      .where('po.business_id = :businessId', { businessId });

    if (query.store_id) {
      qb.andWhere('po.store_id = :storeId', {
        storeId: query.store_id,
      });
    }

    if (query.supplier_id) {
      qb.andWhere('po.supplier_id = :supplierId', {
        supplierId: query.supplier_id,
      });
    }

    this.applyDateFilters(qb, 'po', query);

    const trends = await qb
      .select(bucket, 'period')
      .addSelect('COUNT(po.id)', 'order_count')
      .addSelect(
        'COALESCE(SUM(po.total_estimated_cost), 0)',
        'estimated_procurement_value',
      )
      .groupBy(bucket)
      .orderBy('period', 'ASC')
      .getRawMany();

    return successResponse('Procurement trends retrieved successfully.', {
      interval,
      trends: trends.map((row) => ({
        period: row.period,
        order_count: Number(row.order_count ?? 0),

        // Preserve the database's monetary representation.
        estimated_procurement_value: String(
          row.estimated_procurement_value ?? '0',
        ),
      })),
    });
  }
}
