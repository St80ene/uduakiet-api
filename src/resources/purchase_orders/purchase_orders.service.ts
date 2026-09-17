import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, FindOptionsWhere } from 'typeorm';
import { CreatePurchaseOrderDto } from './dto/create-purchase_order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase_order.dto';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase_order.entity';
import { PurchaseOrderItem } from './entities/purchase_order_item.entity';
import {
  PurchaseOrderPaginationQueryDto,
  PurchaseOrderSortFields,
} from '../../common/dto/pagination-query.dto';
import { Product } from '../products/entities/product.entity';
import { ProductSource } from '../product_sources/entities/product_source.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { DashboardCard } from '../dashboard/interfaces/initial_interface';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,

    private readonly dataSource: DataSource,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductSource)
    private readonly productSourceRepository: Repository<ProductSource>,

    private readonly supplierService: SuppliersService,
  ) {}

  // CREATE: Generate a new Purchase Order with nested items
  async create(
    createPoDto: CreatePurchaseOrderDto,
    creatorId: string,
  ): Promise<ApiResponse<PurchaseOrder>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalCost: number = 0;

      if (createPoDto.status !== PurchaseOrderStatus.DRAFT) {
        // 1. Calculate the total cost across all nested items
        totalCost = createPoDto.items.reduce(
          (sum, item) =>
            sum + item.quantity_requested! * item.estimated_unit_cost!,
          0,
        );
      }

      // 2. Instantiate the root purchase order record
      const poRecord = queryRunner.manager.create(PurchaseOrder, {
        po_number: `PO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        supplier_id: createPoDto.supplier_id,
        total_estimated_cost: totalCost,
        created_by_id: creatorId,
        status: PurchaseOrderStatus.DRAFT,
      });

      const savedPo = await queryRunner.manager.save(PurchaseOrder, poRecord);

      // 3. Instantiate and link the child line items
      const poItems = createPoDto.items.map((item) =>
        queryRunner.manager.create(PurchaseOrderItem, {
          ...item,
          purchase_order_id: savedPo.id,
        }),
      );

      await queryRunner.manager.save(PurchaseOrderItem, poItems);
      await queryRunner.commitTransaction();

      // Return complete object back to caller with loaded items relation
      const existing_purchase_order = await this.findOne(savedPo.id);

      return successResponse(
        'Purchase Order created',
        existing_purchase_order.data,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Failed to instantiate Purchase Order:', error);
      throw new InternalServerErrorException(
        'Could not create purchase order entry.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  // READ ALL: Find matching orders
  async findAll(paginationQuery: PurchaseOrderPaginationQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      approved_by_id,
      supplier_name,
    } = paginationQuery;
    const skip = (page - 1) * limit;

    const { search, order = 'DESC', sortBy = 'created_at' } = paginationQuery;

    const sortColumn = PurchaseOrderSortFields[sortBy];

    const sortOrder: 'ASC' | 'DESC' =
      order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const findWhere: FindOptionsWhere<PurchaseOrder> = {};

    if (status) {
      findWhere['status'] = status as PurchaseOrderStatus;
    }
    if (approved_by_id) {
      findWhere['approved_by_id'] = ILike(`%${approved_by_id}%`);
    }
    if (supplier_name) {
      findWhere['supplier_name'] = ILike(`%${supplier_name}%`);
    }

    const queryBuilder = this.purchaseOrderRepository
      .createQueryBuilder('purchase_order')
      .leftJoinAndSelect('purchase_order.items', 'items')
      .where(findWhere);

    // findAndCount returns an array: [data, totalCount]
    // const [orders, totalItems] =
    //   await this.purchaseOrderRepository.findAndCount({
    //     relations: { items: true },
    //     order: { created_at: 'DESC' },
    //     skip: skip,
    //     take: limit,
    //     where: findWhere,
    //   });

    if (search) {
      queryBuilder.andWhere(
        `
          (
            LOWER(purchase_order.po_number) LIKE LOWER(:search)
            OR LOWER(purchase_order.status) LIKE LOWER(:search)
          )
          `,
        {
          search: `%${search}%`,
        },
      );
    }

    queryBuilder.orderBy(sortColumn, sortOrder).skip(skip).take(limit);

    const [orders, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: orders,
      meta: {
        totalItems,
        itemCount: orders.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  // READ ONE: Detailed lookup via ID reference
  async findOne(id: string): Promise<ApiResponse<PurchaseOrder>> {
    const purchase_order = await this.purchaseOrderRepository.findOne({
      where: { id },
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
  ): Promise<ApiResponse<PurchaseOrder>> {
    const purchase_order = await this.purchaseOrderRepository.findOne({
      where: { id },
    });

    if (!purchase_order)
      throw new NotFoundException(
        `Product with ID "${id}" could not be found.`,
      );

    // Guard: Prevent modification of completed orders unless explicitly handling arrivals
    if (
      purchase_order.status === PurchaseOrderStatus.RECEIVED ||
      purchase_order.status === PurchaseOrderStatus.CANCELLED
    ) {
      // Guard: Prevent modification of completed orders unless explicitly handling arrivals
      throw new BadRequestException(
        `Cannot alter a purchase order that is already ${purchase_order?.status}.`,
      );
    }

    this.purchaseOrderRepository.merge(purchase_order, updatePoDto);
    const updated: PurchaseOrder =
      await this.purchaseOrderRepository.save(purchase_order);

    return successResponse('Purchase Order updated successfully', updated);
  }

  // DELETE: Remove drafts safely
  async remove(id: string): Promise<ApiResponse<null>> {
    const purchase_order = await this.findOne(id);

    if (!purchase_order)
      throw new NotFoundException(
        `Product with ID "${id}" could not be found.`,
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
  // ) {
  //   // Check if an open DRAFT Purchase Order already exists for this supplier
  //   const existingDraft = await this.purchaseOrderRepository.findOne({
  //     where: {
  //       supplier_id: supplierId, // Switched from supplier_name to secure relation ID
  //       status: PurchaseOrderStatus.DRAFT,
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

  //     await this.create(newDraft, creatorId);
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
