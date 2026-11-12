import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets } from 'typeorm';
import { CreatePurchaseOrderDto } from './dto/create-purchase_order.dto';
import {
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/update-purchase_order.dto';
import {
  PurchaseOrder,
  PurchaseOrderListItem,
  PurchaseOrderRawRow,
  PurchaseOrderStatus,
} from './entities/purchase_order.entity';
import { PurchaseOrderItem } from './entities/purchase_order_item.entity';
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
import { Store } from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { Stock } from '../stocks/entities/stock.entity';
import {
  StockMovement,
  StockMovementDirection,
  StockMovementType,
} from '../stock_movements/entities/stock_movement.entity';
import { ProductSource } from '../product_sources/entities/product_source.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { randomUUID } from 'node:crypto';

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
    storeId: string,
  ): Promise<ApiResponse<null>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      const { items } = createPoDto;

      if (!businessId) {
        throw new BadRequestException('Business is required.');
      }

      if (!storeId) {
        throw new BadRequestException('A destination store is required.');
      }

      if (!items?.length) {
        throw new BadRequestException(
          'A purchase order must contain at least one item.',
        );
      }

      // Prevent duplicate products.
      const product_ids = [...new Set(items.map((item) => item.product_id))];

      if (product_ids.length !== items.length) {
        throw new BadRequestException(
          'Duplicate products found in line items.',
        );
      }

      // Validate creator.
      const creator = await manager.findOne(User, {
        where: { id: creatorId, business_id: businessId },
      });

      if (!creator) {
        throw new NotFoundException('Authorized creator not found.');
      }

      // Validate destination store.
      const store = await manager.findOne(Store, {
        where: { id: storeId, business_id: businessId },
      });

      if (!store) {
        throw new NotFoundException('Store not found.');
      }

      // Validate products.
      const products = await manager.find(Product, {
        where: {
          id: In(product_ids),
          business_id: businessId,
        },
      });

      if (products.length !== product_ids.length) {
        throw new BadRequestException(
          'One or more products do not belong to this business.',
        );
      }

      // Find primary suppliers.
      const primary_sources = await manager.find(ProductSource, {
        where: {
          product_id: In(product_ids),
          is_primary: true,
        },
      });

      const source_by_product = new Map<string, ProductSource>();

      for (const source of primary_sources) {
        if (source_by_product.has(source.product_id)) {
          const product = products.find(
            (item) => item.id === source.product_id,
          );

          throw new BadRequestException(
            `Product "${product?.name ?? source.product_id}" has multiple primary suppliers.`,
          );
        }

        source_by_product.set(source.product_id, source);
      }

      const missing_source_ids = product_ids.filter(
        (id) => !source_by_product.has(id),
      );

      if (missing_source_ids.length) {
        throw new BadRequestException(
          `No primary supplier configured for: ${missing_source_ids.join(', ')}`,
        );
      }

      // Validate suppliers.
      const supplier_ids = [
        ...new Set(primary_sources.map((source) => source.supplier_id)),
      ];

      const suppliers = await manager.find(Supplier, {
        where: {
          id: In(supplier_ids),
          business_id: businessId,
        },
      });

      if (suppliers.length !== supplier_ids.length) {
        throw new BadRequestException(
          'One or more configured suppliers do not belong to this business.',
        );
      }

      // Group products by supplier.
      const grouped_items = new Map<
        string,
        Array<{
          product_id: string;
          quantity_requested: number;
          estimated_unit_cost: number;
          total_cost: number;
        }>
      >();

      for (const item of items) {
        const source = source_by_product.get(item.product_id)!;
        const unit_cost = Number(source.cost_price);
        const quantity = item.quantity_requested;

        if (!Number.isFinite(unit_cost) || unit_cost < 0) {
          throw new BadRequestException(
            `Invalid supplier cost for product "${item.product_id}".`,
          );
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new BadRequestException(
            `Invalid requested quantity for product "${item.product_id}".`,
          );
        }

        const supplier_items = grouped_items.get(source.supplier_id) ?? [];

        supplier_items.push({
          product_id: item.product_id,
          quantity_requested: quantity,
          estimated_unit_cost: unit_cost,
          total_cost: quantity * unit_cost,
        });

        grouped_items.set(source.supplier_id, supplier_items);
      }

      // Create one draft purchase order per supplier.
      for (const [supplierId, order_items] of grouped_items) {
        const total_estimated_cost = order_items.reduce(
          (sum, item) => sum + item.total_cost,
          0,
        );

        const purchaseOrder = manager.create(PurchaseOrder, {
          po_number: `PO-${Date.now()}-${randomUUID()
            .slice(0, 8)
            .toUpperCase()}`,
          supplier_id: supplierId,
          business_id: businessId,
          store_id: storeId,
          created_by_id: creator.id,
          status: PurchaseOrderStatus.DRAFT,
          total_estimated_cost,
        });

        const savedPo = await manager.save(PurchaseOrder, purchaseOrder);

        const po_items = order_items.map((item) =>
          manager.create(PurchaseOrderItem, {
            purchase_order_id: savedPo.id,
            product_id: item.product_id,
            quantity_requested: item.quantity_requested,
            quantity_received: 0,
            estimated_unit_cost: item.estimated_unit_cost,
            total_cost: item.total_cost,
          }),
        );

        await manager.save(PurchaseOrderItem, po_items);
      }

      await queryRunner.commitTransaction();

      const createdCount = grouped_items.size;

      return successResponse(
        `${createdCount} draft purchase order${createdCount === 1 ? '' : 's'} created successfully.`,
        null,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Unable to create purchase orders.',
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
      relations: {
        created_by: true,
        approved_by: true,
        items: {
          product: true, // This loads the Product attached to each PurchaseOrderItem
        },
        supplier: true,
      },
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
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      const { items } = updatePoDto;

      // 1. Fetch and lock the purchase order
      const purchaseOrder = await manager.findOne(PurchaseOrder, {
        where: {
          id,
          business_id: businessId,
          ...(storeId && { store_id: storeId }),
        },
        relations: { items: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Purchase order not found.');
      }

      // 2. Only draft purchase orders can be edited
      if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
        throw new BadRequestException(
          'Only draft purchase orders can be edited.',
        );
      }

      // 3. Validate the existing supplier
      const supplier = await manager.findOne(Supplier, {
        where: {
          id: purchaseOrder.supplier_id,
          business_id: businessId,
        },
      });

      if (!supplier) {
        throw new BadRequestException(
          'The supplier assigned to this purchase order is invalid.',
        );
      }

      // 4. Nothing else to update if items were not supplied
      if (items !== undefined) {
        // Reject duplicate products
        const productIds = items.map((item) => item.product_id);

        if (new Set(productIds).size !== productIds.length) {
          throw new BadRequestException(
            'Duplicate products found in purchase order items.',
          );
        }

        // 5. Validate that all products are supplied by this supplier
        const product_sources = await manager.find(ProductSource, {
          where: {
            supplier_id: purchaseOrder.supplier_id,
            product_id: In(productIds),
          },
        });

        // get unique sources
        const source_map = new Map(
          product_sources.map((source) => [
            source.product_id,
            Number(source.cost_price),
          ]),
        );

        const invalidProducts = productIds.filter(
          (productId) => !source_map.has(productId),
        );

        if (invalidProducts.length > 0) {
          throw new BadRequestException(
            `The assigned supplier does not supply these products: ${invalidProducts.join(', ')}`,
          );
        }

        // 6. Match incoming items against existing items
        const existing_items = new Map(
          purchaseOrder.items.map((item) => [item.product_id, item]),
        );

        const updated_items: PurchaseOrderItem[] = items.map((item) => {
          const existing_item = existing_items.get(item.product_id);

          const supplier_cost = source_map.get(item.product_id);

          // Preserve the price snapshot for existing items.
          // Use the supplier's current price for newly added items.
          const unit_cost = existing_item
            ? Number(existing_item.estimated_unit_cost)
            : Number(supplier_cost);

          const total_cost = Number(
            (item.quantity_requested * unit_cost).toFixed(2),
          );

          if (existing_item) {
            existing_item.quantity_requested = item.quantity_requested;
            existing_item.estimated_unit_cost = unit_cost;
            existing_item.total_cost = total_cost;

            return existing_item;
          }

          return manager.create(PurchaseOrderItem, {
            purchase_order_id: purchaseOrder.id,
            product_id: item.product_id,
            quantity_requested: item.quantity_requested,
            quantity_received: 0,
            estimated_unit_cost: unit_cost,
            total_cost,
          });
        });

        // 7. Remove items no longer present in the updated list
        const incomingProductIds = new Set(productIds);

        const removedItemIds = purchaseOrder.items
          .filter((item) => !incomingProductIds.has(item.product_id))
          .map((item) => item.id);

        if (removedItemIds.length > 0) {
          await manager.delete(PurchaseOrderItem, {
            id: In(removedItemIds),
          });
        }

        // 8. Save updated and newly added items
        await manager.save(PurchaseOrderItem, updated_items);

        // 9. Recalculate the purchase order total
        purchaseOrder.total_estimated_cost = Number(
          updated_items
            .reduce((sum, item) => sum + Number(item.total_cost), 0)
            .toFixed(2),
        );

        await manager.save(PurchaseOrder, purchaseOrder);
      }

      await queryRunner.commitTransaction();

      // 10. Return updated purchase order
      const freshRecord = await this.findOne(id, businessId, storeId);

      return successResponse(
        'Purchase order updated successfully.',
        freshRecord.data,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException(
        'Unable to update purchase order.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async receive(
    po_id: string,
    dto: ReceivePurchaseOrderDto,
    businessId: string,
    receivedById: string,
    storeId?: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      console.log('storeId', storeId);

      const purchaseOrder = await manager.findOne(PurchaseOrder, {
        where: {
          id: po_id,
          business_id: businessId,
          // ...(storeId && { store_id: storeId }),
        },
        relations: { items: true },
        // lock: { mode: 'pessimistic_write' },
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Purchase order not found.');
      }

      // Receiving is only allowed after the PO has been sent.
      if (purchaseOrder.status !== PurchaseOrderStatus.SENT_TO_SUPPLIER) {
        throw new BadRequestException(
          `Cannot receive a purchase order with status "${purchaseOrder.status}".`,
        );
      }

      if (!purchaseOrder.items?.length) {
        throw new BadRequestException('Purchase order has no items.');
      }

      if (!dto.items?.length) {
        throw new BadRequestException('Received items are required.');
      }

      // Validate the receiving user.
      const receiver = await manager.findOne(User, {
        where: { id: receivedById, business_id: businessId },
      });

      if (!receiver) {
        throw new NotFoundException('Authorized receiving user not found.');
      }

      // One receipt operation must account for every PO item.
      if (dto.items.length !== purchaseOrder.items.length) {
        throw new BadRequestException(
          'All purchase order items must be included in the receipt.',
        );
      }

      const purchaseOrderItems = new Map(
        purchaseOrder.items.map((item) => [item.id, item]),
      );

      const submittedItemIds = new Set<string>();

      for (const receiptItem of dto.items) {
        if (submittedItemIds.has(receiptItem.item_id)) {
          throw new BadRequestException(
            `Duplicate receipt item "${receiptItem.item_id}".`,
          );
        }

        submittedItemIds.add(receiptItem.item_id);

        const item = purchaseOrderItems.get(receiptItem.item_id);

        if (!item) {
          throw new BadRequestException(
            `Item "${receiptItem.item_id}" does not belong to this purchase order.`,
          );
        }

        const quantity = receiptItem.quantity_received;
        const requested = Number(item.quantity_requested);

        // One-time receiving means the full requested quantity must arrive.
        if (!Number.isInteger(quantity) || quantity !== requested) {
          throw new BadRequestException(
            `Product "${item.product.name}" must be received in full. Expected ${requested}.`,
          );
        }

        if (Number(item.quantity_received ?? 0) > 0) {
          throw new BadRequestException(
            `Product "${item.product.name}" has already been received.`,
          );
        }

        // Lock the product row. This serializes receipts for the same
        // product, even when they come from different purchase orders.
        const product = await manager.findOne(Product, {
          where: {
            id: item.product_id,
            business_id: businessId,
          },
          // lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new NotFoundException(
            `Product "${item.product.name}" not found.`,
          );
        }

        // Find the stock record for this product and destination store.
        let stock = await manager.findOne(Stock, {
          where: {
            product_id: item.product_id,
            business_id: businessId,
            store_id: purchaseOrder.store_id,
          },
        });

        const quantityBefore = stock ? Number(stock.current_quantity) : 0;

        if (!stock) {
          stock = manager.create(Stock, {
            product_id: item.product_id,
            business_id: businessId,
            store_id: purchaseOrder.store_id,
            current_quantity: quantity,
          });
        } else {
          stock.current_quantity = quantityBefore + quantity;
        }

        const savedStock = await manager.save(Stock, stock);

        // Record the actual stock movement.
        const movement = manager.create(StockMovement, {
          stock_id: savedStock.id,
          business_id: businessId,
          created_by_id: receiver.id,
          type: StockMovementType.RECEIPT,
          direction: StockMovementDirection.IN,
          quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityBefore + quantity,
          unit_cost_price: Number(item.estimated_unit_cost),
          unit_selling_price: Number(product.selling_price),
        });

        await manager.save(StockMovement, movement);

        item.quantity_received = quantity;
        await manager.save(PurchaseOrderItem, item);
      }

      // All lines have been received in full.
      purchaseOrder.status = PurchaseOrderStatus.RECEIVED;

      await manager.save(PurchaseOrder, purchaseOrder);

      // Load the final PO and its items for the response.
      const updatedPurchaseOrder = await manager.findOne(PurchaseOrder, {
        where: { id: purchaseOrder.id },
        relations: { items: true, supplier: true, store: true },
      });

      await queryRunner.commitTransaction();

      return successResponse(
        'Purchase order received successfully.',
        updatedPurchaseOrder!,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // DELETE: Remove drafts safely
  async remove_draft(
    id: string,
    businessId: string,
  ): Promise<ApiResponse<null>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      const purchaseOrder = await manager.findOne(PurchaseOrder, {
        where: {
          id,
          business_id: businessId,
        },
        // lock: { mode: 'pessimistic_write' },
      });

      if (!purchaseOrder) {
        throw new NotFoundException(
          `Purchase order with ID "${id}" could not be found.`,
        );
      }

      if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
        throw new BadRequestException(
          'Only draft purchase orders can be deleted.',
        );
      }

      await manager.softRemove(PurchaseOrder, purchaseOrder);

      await queryRunner.commitTransaction();

      return successResponse(
        'Draft purchase order deleted successfully.',
        null,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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

  async submitForApproval(
    id: string,
    businessId: string,
    submittedById: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.transitionPurchaseOrder(
      id,
      businessId,
      submittedById,
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.PENDING_APPROVAL,
    );
  }

  async approve(
    id: string,
    businessId: string,
    approvedById: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.transitionPurchaseOrder(
      id,
      businessId,
      approvedById,
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.APPROVED,
      { approved_by_id: approvedById },
    );
  }

  async markAsSentToSupplier(
    id: string,
    businessId: string,
    sentById: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    return this.transitionPurchaseOrder(
      id,
      businessId,
      sentById,
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderStatus.SENT_TO_SUPPLIER,
    );
  }

  async reject(
    id: string,
    businessId: string,
    rejectedById: string,
    reason: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    // return this.transitionPurchaseOrder({
    //   id,
    //   businessId,
    //   actorId: rejectedById,
    //   expectedStatus: PurchaseOrderStatus.PENDING_APPROVAL,
    //   nextStatus: PurchaseOrderStatus.DRAFT,
    //   extraFields: {
    //     rejection_reason: reason.trim(),
    //   },
    // });
    return this.transitionPurchaseOrder(
      id,
      businessId,
      rejectedById,
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.DRAFT,
      //   {
      //   rejection_reason: reason.trim(),
      // }
    );
  }

  async cancel(
    id: string,
    businessId: string,
    cancelledById: string,
    reason: string,
    supplier_cancellation_confirmed = false,
  ): Promise<ApiResponse<PurchaseOrder>> {
    if (!reason?.trim()) {
      throw new BadRequestException('Cancellation reason is required');
    }

    const purchaseOrder = await this.findOne(id, businessId);

    const allowedStatuses = [
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.APPROVED,
    ];

    if (purchaseOrder.data?.status === PurchaseOrderStatus.SENT_TO_SUPPLIER) {
      if (!supplier_cancellation_confirmed) {
        throw new BadRequestException(
          'Supplier cancellation must be confirmed first',
        );
      }
    } else if (
      !allowedStatuses.includes(
        purchaseOrder.data?.status as PurchaseOrderStatus,
      )
    ) {
      throw new BadRequestException('This purchase order cannot be cancelled');
    }

    return this.transitionPurchaseOrder(
      id,
      businessId,
      cancelledById,
      purchaseOrder.data?.status as PurchaseOrderStatus,
      PurchaseOrderStatus.CANCELLED,
      // extraFields: {
      //   cancellation_reason: reason.trim(),
      // },
    );
  }

  private async transitionPurchaseOrder(
    id: string,
    businessId: string,
    actorId: string,
    expectedStatus: PurchaseOrderStatus,
    nextStatus: PurchaseOrderStatus,
    extraFields: Partial<PurchaseOrder> = {},
  ): Promise<ApiResponse<PurchaseOrder>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      const purchaseOrder = await manager.findOne(PurchaseOrder, {
        where: {
          id,
          business_id: businessId,
        },
        // lock: { mode: 'pessimistic_write' },
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Purchase order not found.');
      }

      if (purchaseOrder.status !== expectedStatus) {
        throw new BadRequestException(
          `This action requires a purchase order with status "${expectedStatus}". Current status: "${purchaseOrder.status}".`,
        );
      }

      const actor = await manager.findOne(User, {
        where: {
          id: actorId,
          business_id: businessId,
        },
      });

      if (!actor) {
        throw new NotFoundException('Authorized user not found.');
      }

      // A PO must have a valid supplier before it can be sent.
      if (nextStatus === PurchaseOrderStatus.SENT_TO_SUPPLIER) {
        const supplier = await manager.findOne(Supplier, {
          where: {
            id: purchaseOrder.supplier_id,
            business_id: businessId,
          },
        });

        if (!supplier) {
          throw new BadRequestException(
            'The purchase order supplier is invalid.',
          );
        }
      }

      Object.assign(purchaseOrder, extraFields, {
        status: nextStatus,
      });

      await manager.save(PurchaseOrder, purchaseOrder);

      const updatedPurchaseOrder = await manager.findOne(PurchaseOrder, {
        where: { id: purchaseOrder.id },
        relations: { items: true, supplier: true, store: true },
      });

      await queryRunner.commitTransaction();

      return successResponse(
        `Purchase order moved to ${nextStatus} successfully.`,
        updatedPurchaseOrder!,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
