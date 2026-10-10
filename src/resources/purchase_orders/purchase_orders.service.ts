import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets } from 'typeorm';
import { CreatePurchaseOrderDto } from './dto/create-purchase_order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase_order.dto';
import {
  PurchaseOrder,
  PurchaseOrderListItem,
  PurchaseOrderRawRow,
  PurchaseOrderStatus,
} from './entities/purchase_order.entity';
import {
  PurchaseOrderItem,
  ReceivePurchaseOrderDto,
} from './entities/purchase_order_item.entity';
import {
  PaginationMeta,
  PurchaseOrderPaginationQueryDto,
  PurchaseOrderSortFields,
} from '../../common/dto/pagination-query.dto';
import { Product } from '../products/entities/product.entity';
import { DashboardCard } from '../dashboard/interfaces/initial_interface';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';
import { Business } from '../business/entities/business.entity';
import { Store } from '../stores/entities/store.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { User } from '../users/entities/user.entity';
import { Stock } from '../stocks/entities/stock.entity';
import {
  StockMovement,
  StockMovementDirection,
  StockMovementType,
} from '../stock_movements/entities/stock_movement.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,

    private readonly dataSource: DataSource,
  ) {}

  // CREATE: Generate a new Purchase Order with nested items
  async create(
    createPoDto: CreatePurchaseOrderDto,
    creatorId: string,
    businessId: string,
    storeId?: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      const { supplier_id, items, status } = createPoDto;

      // =========================================================
      // 1. Validate required fields
      // =========================================================

      if (!businessId) {
        throw new BadRequestException('Business is required.');
      }

      if (!supplier_id) {
        throw new BadRequestException('Supplier is required.');
      }

      if (!items?.length) {
        throw new BadRequestException(
          'Purchase order must contain at least one item.',
        );
      }

      // =========================================================
      // 2. Validate business
      // =========================================================

      const business = await manager.findOne(Business, {
        where: {
          id: businessId,
        },
      });

      if (!business) {
        throw new NotFoundException('Business not found.');
      }

      // =========================================================
      // 3. Validate store
      // =========================================================
      if (storeId) {
        await manager.findOne(Store, {
          where: {
            id: storeId,
            business_id: businessId,
          },
        });
      }

      // =========================================================
      // 4. Validate creator
      // =========================================================

      const creator = await manager.findOne(User, {
        where: {
          id: creatorId,
          business_id: businessId,
        },
      });

      if (!creator) {
        throw new NotFoundException(
          'Creator not found or does not belong to this business.',
        );
      }

      // =========================================================
      // 5. Validate supplier
      // =========================================================

      const supplier = await manager.findOne(Supplier, {
        where: {
          id: supplier_id,
          business_id: businessId,
        },
      });

      if (!supplier) {
        throw new NotFoundException(
          'Supplier not found or does not belong to this business.',
        );
      }

      // =========================================================
      // 6. Generate and check PO number
      // =========================================================

      const uniquePoNumber = `PO-${Date.now()}-${Math.floor(
        1000 + Math.random() * 9000,
      )}`;

      const existingPo = await manager.findOne(PurchaseOrder, {
        where: {
          po_number: uniquePoNumber,
        },
        select: {
          id: true,
        },
      });

      if (existingPo) {
        throw new ConflictException('Purchase order number already exists.');
      }

      // =========================================================
      // 7. Validate duplicate products in request
      // =========================================================

      const productIds = items.map((item) => item.product_id);
      const uniqueProductIds = [...new Set(productIds)];

      if (uniqueProductIds.length !== productIds.length) {
        throw new BadRequestException(
          'A product cannot appear more than once in a purchase order.',
        );
      }

      // =========================================================
      // 8. Validate products
      // =========================================================

      const products = await manager.find(Product, {
        where: {
          business_id: businessId,
          id: In(uniqueProductIds),
        },
        select: {
          id: true,
        },
      });

      // check for missing items and throw an error if any are not found
      if (products.length !== uniqueProductIds.length) {
        const foundProductIds = new Set(products.map((product) => product.id));

        const missingProductIds = uniqueProductIds.filter(
          (id) => !foundProductIds.has(id),
        );

        throw new NotFoundException(
          `Product(s) not found: ${missingProductIds.join(', ')}`,
        );
      }

      // =========================================================
      // 9. Validate item quantities and costs
      // =========================================================

      for (const item of items) {
        if ((item.quantity_requested ?? 0) <= 0) {
          throw new BadRequestException(
            `Quantity requested must be greater than zero for product ${item.product_id}.`,
          );
        }

        if ((item.estimated_unit_cost ?? 0) < 0) {
          throw new BadRequestException(
            `Estimated unit cost cannot be negative for product ${item.product_id}.`,
          );
        }
      }

      // =========================================================
      // 10. Calculate total
      // =========================================================

      const total_estimated_cost =
        status === PurchaseOrderStatus.DRAFT
          ? 0
          : items.reduce(
              (sum, item) =>
                sum +
                (item?.quantity_requested ?? 0) *
                  (item?.estimated_unit_cost ?? 0),
              0,
            );

      // =========================================================
      // 11. Create purchase order
      // =========================================================

      const poRecord = manager.create(PurchaseOrder, {
        po_number: uniquePoNumber,
        supplier_id: supplier.id,
        total_estimated_cost,
        created_by_id: creator.id,
        business_id: businessId,
        store_id: storeId,
        status: status ?? PurchaseOrderStatus.DRAFT,
      });

      const savedPo = await manager.save(PurchaseOrder, poRecord);

      // =========================================================
      // 12. Create purchase order items
      // =========================================================

      const poItems = items.map((item) =>
        manager.create(PurchaseOrderItem, {
          ...item,
          purchase_order_id: savedPo.id,
        }),
      );

      await manager.save(PurchaseOrderItem, poItems);

      // =========================================================
      // 13. Commit transaction
      // =========================================================

      await queryRunner.commitTransaction();

      // =========================================================
      // 14. Return complete purchase order
      // =========================================================

      const existingPurchaseOrder = await this.findOne(
        savedPo.id,
        businessId,
        storeId,
      );

      return successResponse(
        'Purchase Order created',
        existingPurchaseOrder.data,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Preserve intentional HTTP errors
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Failed to create Purchase Order:', error);

      throw new InternalServerErrorException(
        'Could not create purchase order entry.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  // READ ALL: Find matching orders
  async findAll(
    businessId: string,
    paginationQuery: PurchaseOrderPaginationQueryDto,
    storeId?: string,
  ): Promise<
    ApiResponse<{
      purchase_orders: PurchaseOrderRawRow[];
      meta: PaginationMeta;
    }>
  > {
    const {
      page = 1,
      limit = 10,
      search,
      order = 'DESC',
      sortBy = 'created_at',
    } = paginationQuery;

    const sortColumn = PurchaseOrderSortFields[sortBy] || 'created_at';
    const sortOrder = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const queryBuilder = this.purchaseOrderRepository
      .createQueryBuilder('purchase_order')
      .leftJoin('purchase_order.supplier', 'supplier')
      .select([
        'purchase_order.id AS id',
        'purchase_order.po_number AS po_number',
        'purchase_order.status AS status',
        'purchase_order.total_estimated_cost AS total_estimated_cost',
        'purchase_order.created_at AS created_at',
        'supplier.name AS supplier_name',
      ])
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(item.id)')
          .from('purchase_order_items', 'item')
          .where('item.purchase_order_id = purchase_order.id');
      }, 'items_count')
      .where('purchase_order.business_id = :businessId', { businessId });

    if (storeId) {
      queryBuilder.andWhere('purchase_order.store_id = :storeId', { storeId });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('purchase_order.po_number LIKE :search')
            .orWhere('purchase_order.status LIKE :search')
            .orWhere('supplier.name LIKE :search')
            .orWhere('purchase_order.status LIKE :search');
        }),
        { search: `%${search}%` },
      );
    }

    const orderByColumn =
      PurchaseOrderSortFields[sortColumn] ?? PurchaseOrderSortFields.created_at;
    const orderDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countQuery = queryBuilder.clone();

    const dataQuery = queryBuilder
      .orderBy(orderByColumn, orderDirection)
      .limit(limit)
      .offset((page - 1) * limit);
    const [rows, totalItems] = await Promise.all([
      dataQuery.getRawMany<PurchaseOrderRawRow>(),
      countQuery.getCount(),
    ]);

    const purchase_orders: PurchaseOrderListItem[] = rows.map((row) => ({
      ...row,
      items_count: Number(row.items_count),
      total_estimated_cost: Number(row.total_estimated_cost),
    }));

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return successResponse('Purchase Orders retrieved successfully', {
      purchase_orders,
      meta: {
        totalItems,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  }

  // READ ONE: Detailed lookup via ID reference
  async findOne(
    id: string,
    businessId: string,
    storeId?: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    const purchase_order = await this.purchaseOrderRepository.findOne({
      where: {
        id,
        business_id: businessId,
        // To allow Company executives to search for purchase orders across all stores, we make the storeId optional in the query.
        ...(storeId && { store_id: storeId }),
      },
      relations: { items: true },
    });
    if (!purchase_order) {
      throw new NotFoundException(
        `Purchase Order with ID "${id}" could not be found.`,
      );
    }

    return successResponse(
      'Purchase Order retrieved successfully',
      purchase_order,
    );
  }

  // UPDATE: Basic properties modification
  async update(
    id: string,
    updatePoDto: UpdatePurchaseOrderDto,
    businessId: string,
    storeId?: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: {
        id,
        business_id: businessId,
        ...(storeId && { store_id: storeId }),
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException(
        `Purchase Order with ID "${id}" could not be found.`,
      );
    }

    if (
      purchaseOrder.status === PurchaseOrderStatus.RECEIVED ||
      purchaseOrder.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot alter a purchase order that is already ${purchaseOrder.status}.`,
      );
    }

    // Status transitions are handled by dedicated workflow methods.
    if (updatePoDto.status !== undefined) {
      throw new BadRequestException(
        'Purchase order status cannot be changed through this endpoint.',
      );
    }

    this.purchaseOrderRepository.merge(purchaseOrder, updatePoDto);

    const updatedPurchaseOrder =
      await this.purchaseOrderRepository.save(purchaseOrder);

    return successResponse(
      'Purchase Order updated successfully',
      updatedPurchaseOrder,
    );
  }

  async receive(
    po_id: string,
    dto: ReceivePurchaseOrderDto,
    businessId: string,
    receivedById: string,
    storeId?: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    // Create a dedicated database connection for this transaction.
    // All stock, stock movement, item, and purchase order changes must
    // succeed or fail together to prevent inconsistent inventory records.
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use the transaction's entity manager for every database operation
      // so all changes participate in the same transaction.
      const query_manager = queryRunner.manager;

      // Retrieve the purchase order and its items.
      // Scope the lookup to the business and, when provided, the store
      // to prevent access to another tenant's purchase order.
      // The pessimistic write lock helps prevent concurrent receiving
      // operations from processing the same purchase order simultaneously.
      const purchaseOrder = await query_manager.findOne(PurchaseOrder, {
        where: {
          id: po_id,
          business_id: businessId,
          ...(storeId && { store_id: storeId }),
        },
        relations: {
          items: true,
        },
        lock: { mode: 'pessimistic_write' },
      });

      // Stop processing if the purchase order does not exist
      // within the requested business/store scope.
      if (!purchaseOrder) {
        throw new NotFoundException(
          `Purchase Order with ID "${po_id}" could not be found.`,
        );
      }

      // Prevent receiving an order that has already been completed, draft
      // or cancelled. This also helps prevent duplicate stock additions.
      if (
        purchaseOrder.status === PurchaseOrderStatus.RECEIVED ||
        purchaseOrder.status === PurchaseOrderStatus.CANCELLED ||
        purchaseOrder.status === PurchaseOrderStatus.DRAFT
      ) {
        throw new BadRequestException(
          `Cannot receive a purchase order that is already ${purchaseOrder.status}.`,
        );
      }

      // A purchase order must contain at least one item before stock
      // can be received against it.
      if (!purchaseOrder.items?.length) {
        throw new BadRequestException(
          'Cannot receive a purchase order without items.',
        );
      }

      // Index the purchase order items by ID for efficient lookup.
      // This lets us verify that every submitted receipt item belongs
      // to the purchase order being received.
      const itemMap = new Map(
        purchaseOrder.items.map((item) => [item.id, item]),
      );

      // Track submitted item IDs so the same item cannot appear
      // more than once in a single receipt request.
      const submittedItemIds = new Set<string>();

      // Process each item included in the current delivery.
      for (const receiptItem of dto.items) {
        // Reject duplicate entries to prevent accidentally adding
        // the same delivery quantity more than once.
        if (submittedItemIds.has(receiptItem.item_id)) {
          throw new BadRequestException(
            `Duplicate receipt item "${receiptItem.item_id}".`,
          );
        }

        submittedItemIds.add(receiptItem.item_id);

        // Find the corresponding item on this purchase order.
        // Never accept an arbitrary purchase-order item from another order.
        const item = itemMap.get(receiptItem.item_id);

        if (!item) {
          throw new BadRequestException(
            `Item "${receiptItem.item_id}" does not belong to this purchase order.`,
          );
        }

        // quantity is the quantity arriving in THIS delivery.
        // previouslyReceived is the cumulative quantity received before now.
        // requested is the total quantity originally ordered.
        const quantity = receiptItem.quantity_received;
        const previouslyReceived = Number(item.quantity_received ?? 0);
        const requested = Number(item.quantity_requested);

        // Accept only positive whole-number quantities and prevent
        // receiving more units than were ordered.
        if (
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          previouslyReceived + quantity > requested
        ) {
          throw new BadRequestException(
            `Invalid received quantity for product "${item.product_id}".`,
          );
        }

        // Confirm that the product belongs to the current business.
        // This protects tenant boundaries and prevents invalid references.
        const product = await query_manager.findOne(Product, {
          where: {
            id: item.product_id,
            business_id: businessId,
          },
        });

        if (!product) {
          throw new NotFoundException(
            `Product "${item.product_id}" could not be found.`,
          );
        }

        // Find the inventory record for this product at the destination store.
        // A product can have separate stock records in different stores.
        let stock = await query_manager.findOne(Stock, {
          where: {
            product_id: item.product_id,
            business_id: businessId,
            store_id: purchaseOrder.store_id,
          },
        });

        // Capture the inventory balance before applying this delivery.
        // If no stock record exists yet, its starting balance is zero.
        const quantityBefore = stock ? Number(stock.current_quantity) : 0;

        if (!stock) {
          // First receipt for this product at this store:
          // create a stock record initialized with the delivered quantity.
          stock = query_manager.create(Stock, {
            product_id: item.product_id,
            business_id: businessId,
            store_id: purchaseOrder.store_id,
            current_quantity: quantity,
          });
        } else {
          // Existing inventory: add only the quantity from this delivery,
          // not the cumulative quantity received against the purchase order.
          stock.current_quantity = quantityBefore + quantity;
        }

        // Persist the new inventory balance within the transaction.
        await query_manager.save(Stock, stock);

        // Record the inventory change in the stock movement ledger.
        // This preserves an audit trail of who received the stock,
        // how much arrived, its cost, and the before/after balances.
        const movement = query_manager.create(StockMovement, {
          stock_id: stock.id,
          business_id: businessId,
          created_by_id: receivedById,
          type: StockMovementType.RECEIPT,
          direction: StockMovementDirection.IN,
          quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityBefore + quantity,
          unit_cost_price: Number(item.estimated_unit_cost),
          unit_selling_price: Number(product.selling_price),
        });

        await query_manager.save(StockMovement, movement);

        // Update the cumulative received quantity for this PO item.
        // Example: 40 previously received + 10 arriving now = 50 received.
        item.quantity_received = previouslyReceived + quantity;

        await query_manager.save(PurchaseOrderItem, item);
      }

      // Check whether every item has now been received in full.
      // An order with outstanding quantities must not be marked RECEIVED.
      const fullyReceived = purchaseOrder.items.every(
        (item) =>
          Number(item.quantity_received) >= Number(item.quantity_requested),
      );

      // Transition to RECEIVED only when all ordered quantities
      // have been fulfilled. Otherwise, retain the current status.
      if (fullyReceived) {
        purchaseOrder.status = PurchaseOrderStatus.RECEIVED;
      }

      // Persist the purchase order's final status within the same transaction
      // as the inventory and ledger changes.
      const updatedPurchaseOrder = await query_manager.save(
        PurchaseOrder,
        purchaseOrder,
      );

      // Commit only after every operation succeeds.
      await queryRunner.commitTransaction();

      // Return a message that distinguishes a complete receipt
      // from a receipt that leaves quantities outstanding.
      return successResponse(
        fullyReceived
          ? 'Purchase Order fully received successfully'
          : 'Purchase Order receipt recorded successfully',
        updatedPurchaseOrder,
      );
    } catch (error) {
      // Roll back all changes if any operation fails, preventing a receipt
      // from updating only some of the stock, ledger, or order records.
      await queryRunner.rollbackTransaction();

      // Preserve the original error for NestJS exception handling.
      throw error;
    } finally {
      // Always release the database connection, whether the transaction
      // succeeds or fails.
      await queryRunner.release();
    }
  }

  // DELETE: Remove drafts safely
  async remove_draft(
    id: string,
    businessId: string,
  ): Promise<ApiResponse<null>> {
    const purchase_order = await this.findOne(id, businessId);

    if (!purchase_order)
      throw new NotFoundException(
        `Purchase Order with ID "${id}" could not be found.`,
      );

    // Business rule safeguard: Only allow deleting un-submitted drafts
    if (purchase_order.data?.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot delete a purchase order once it leaves the DRAFT state.`,
      );
    }

    await this.purchaseOrderRepository.softRemove(purchase_order.data);
    return successResponse('Purchase order record deleted successfully.', null);
  }

  // private async createOrUpdateDraftForSupplier(
  //   supplierId: string,
  //   productsToReplenish: Product[],
  //   creatorId: string,
  //   businessId: string,
  //   storeId: string,
  // ) {
  //   // Check if an open DRAFT Purchase Order already exists for this supplier
  //   const existingDraft = await this.purchaseOrderRepository.findOne({
  //     where: {
  //       supplier_id: supplierId, // Switched from supplier_name to secure relation ID
  //       status: PurchaseOrderStatus.DRAFT,
  //       ...(businessId && { business_id: businessId }),
  //       ...(storeId && { store_id: storeId }),
  //     },
  //     relations: { items: true },
  //   });

  //   if (!existingDraft) {
  //     // Create a fresh draft Purchase Order
  //     const newDraft = new CreatePurchaseOrderDto();
  //     newDraft.supplier_id = supplierId;

  //     newDraft.items = productsToReplenish.map((product) => {
  //       const replenishmentQty = Math.max(product.reorder_level * 2, 10);
  //       return {
  //         product_id: product.id,
  //         quantity: replenishmentQty,
  //         unit_price: product.cost_price,
  //       };
  //     });

  //     await this.create(newDraft, creatorId, businessId, storeId);
  //   } else {
  //     // Merge deficient items into the existing open draft if they aren't already listed
  //     const existingProductIds = new Set(
  //       existingDraft.items.map((item) => item.product_id),
  //     );

  //     const newItemsToAdd = productsToReplenish
  //       .filter((product) => !existingProductIds.has(product.id))
  //       .map((product) => {
  //         const replenishmentQty = Math.max(product.reorder_level * 2, 10);
  //         return {
  //           product_id: product.id,
  //           product_name: product.name,
  //           quantity: replenishmentQty,
  //           unit_price: product.cost_price,
  //           purchaseOrder: existingDraft,
  //         };
  //       });

  //     if (newItemsToAdd.length > 0) {
  //       await this.purchaseOrderRepository.manager.save(newItemsToAdd);
  //     }
  //   }
  // }

  async getPurchaseOrderPipeline(): Promise<DashboardCard[]> {
    const result: Record<string, any> | undefined =
      await this.purchaseOrderRepository
        .createQueryBuilder('purchase_order')
        .select(
          'SUM(CASE WHEN purchase_order.status = :pending THEN 1 ELSE 0 END)',
          'pendingApproval',
        )
        .addSelect(
          'SUM(CASE WHEN purchase_order.status = :approved THEN 1 ELSE 0 END)',
          'approved',
        )
        .addSelect(
          'SUM(CASE WHEN purchase_order.status = :sent THEN 1 ELSE 0 END)',
          'sentToSupplier',
        )
        .addSelect(
          'SUM(CASE WHEN purchase_order.status = :received THEN 1 ELSE 0 END)',
          'received',
        )
        .addSelect(
          'COALESCE(SUM(purchase_order.total_estimated_cost), 0)',
          'totalEstimatedCost',
        )
        .setParameters({
          pending: PurchaseOrderStatus.PENDING_APPROVAL,
          approved: PurchaseOrderStatus.APPROVED,
          sent: PurchaseOrderStatus.SENT_TO_SUPPLIER,
          received: PurchaseOrderStatus.RECEIVED,
        })
        .getRawOne<{
          pendingApproval: string;
          approved: string;
          sentToSupplier: string;
          received: string;
          totalEstimatedCost: string;
        }>();

    return [
      {
        id: 'pending-approval',
        title: 'Pending Approval',
        value: Number(result?.pendingApproval),
        severity: 'warning',
      },
      {
        id: 'approved',
        title: 'Approved Orders',
        value: Number(result?.approved),
        severity: 'success',
      },
      {
        id: 'sent',
        title: 'Sent to Supplier',
        value: Number(result?.sentToSupplier),
      },
      {
        id: 'received',
        title: 'Received',
        value: Number(result?.received),
        severity: 'success',
      },
      {
        id: 'estimated-cost',
        title: 'Estimated Procurement Cost',
        value: Number(result?.totalEstimatedCost),
      },
    ];
  }

  // async getSupplierProducts(
  //   supplierId: string,
  //   query: BasePaginationQueryDto,
  // ): Promise<ApiResponse<any>> {
  //   await this.supplierService.getSupplierOrThrow(supplierId);

  //   const { page, limit, skip } = getPaginationOptions(query);

  //   const qb = this.productRepository
  //     .createQueryBuilder('product')
  //     .innerJoin('product.source', 'source')
  //     .where('source.supplier_id = :supplierId', {
  //       supplierId,
  //     });

  //   qb.skip(skip).take(limit);

  //   const [products, total] = await qb.getManyAndCount();

  //   return successResponse('Supplier products retrieved successfully', {
  //     products,
  //     pagination: {
  //       page,
  //       limit,
  //       total,
  //       totalPages: Math.ceil(total / limit),
  //     },
  //   });
  // }

  // CRON Task: Automatically create a new draft purchase order for each supplier if none exists based on stock replenishment needs
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // async runAutoReplenishment(creatorId: string) {
  //   // Get all products that are below their reorder threshold
  //   const lowStockProducts: Product[] = await this.productRepository
  //     .createQueryBuilder('product')
  //     .where('product.stock_quantity <= product.reorder_level')
  //     .getMany();

  //   if (lowStockProducts?.length === 0) {
  //     return; // All shelves optimally stocked!
  //   }

  //   // Get the IDs of these low-stock products to find their active suppliers
  //   const productIds: string[] = lowStockProducts.map((p) => p.id);

  //   const activeSuppliers = await this.productSourceRepository.find({
  //     where: {
  //       product_id: In(productIds),
  //     },
  //     relations: {
  //       supplier: true,
  //       product: true,
  //     },
  //   });

  //   const replenishmentMap = new Map<
  //     string,
  //     { supplierName: string; products: Product[] }
  //   >();

  //   for (const source of activeSuppliers) {
  //     if (!source.supplier || !source.product) continue;

  //     const supplierId: string = source['supplier']['id'];
  //     const supplierName: string = source['supplier']['name'];

  //     if (!replenishmentMap.has(`${supplierId}`)) {
  //       replenishmentMap.set(`${supplierId}`, { supplierName, products: [] });
  //     }

  //     replenishmentMap.get(`${supplierId}`)!.products.push(source.product);
  //   }

  //   for (const [supplierId, info] of replenishmentMap.entries()) {
  //     await this.createOrUpdateDraftForSupplier(
  //       supplierId,
  //       info.products,
  //       creatorId,
  //     );
  //   }
  // }
}
