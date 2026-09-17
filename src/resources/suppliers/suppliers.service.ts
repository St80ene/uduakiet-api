import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductSource } from '../product_sources/entities/product_source.entity';
import { Product } from '../products/entities/product.entity';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../purchase_orders/entities/purchase_order.entity';
import { Supplier } from './entities/supplier.entity';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { BasePaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { DashboardCard } from '../dashboard/interfaces/initial_interface';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';
import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,

    @InjectRepository(ProductSource)
    private readonly productSourceRepository: Repository<ProductSource>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
  ): Promise<ApiResponse<Supplier>> {
    const existingSupplier = await this.supplierRepository.findOne({
      where: {
        name: createSupplierDto.name,
      },
    });

    if (existingSupplier) {
      throw new ConflictException('Supplier already exists');
    }

    const supplier = this.supplierRepository.create(createSupplierDto);

    await this.supplierRepository.save(supplier);

    return successResponse('Supplier created successfully', supplier);
  }

  async findAll(query: SupplierQueryDto): Promise<ApiResponse<any>> {
    const { search, sortBy = 'created_at', order = 'DESC' } = query;

    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.supplierRepository.createQueryBuilder('supplier');

    if (search) {
      qb.where('(supplier.name LIKE :search OR supplier.email LIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy(`supplier.${sortBy}`, order).skip(skip).take(limit);

    const [suppliers, total] = await qb.getManyAndCount();

    return successResponse('Suppliers retrieved successfully', {
      suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async findOne(id: string): Promise<ApiResponse<Supplier>> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: {
        productSources: {
          product: true,
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return successResponse('Supplier retrieved successfully', supplier);
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<ApiResponse<Supplier>> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    if (dto.name && dto.name !== supplier.name) {
      const existing = await this.supplierRepository.findOne({
        where: {
          name: dto.name,
        },
      });

      if (existing) {
        throw new ConflictException('Supplier name already exists');
      }
    }

    Object.assign(supplier, dto);

    await this.supplierRepository.save(supplier);

    return successResponse('Supplier updated successfully', supplier);
  }
  async remove(id: string): Promise<ApiResponse<void>> {
    await this.getSupplierOrThrow(id);

    const [products, purchaseOrders] = await Promise.all([
      this.productSourceRepository.count({
        where: {
          supplier_id: id,
        },
      }),

      this.purchaseOrderRepository.count({
        where: {
          supplier_id: id,
        },
      }),
    ]);

    if (products > 0 || purchaseOrders > 0) {
      throw new BadRequestException(
        'Supplier cannot be deleted because it is in use.',
      );
    }

    await this.supplierRepository.delete(id);

    return successResponse('Supplier deleted successfully');
  }

  async getSupplierOrThrow(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async getPurchaseOrders(
    supplierId: string,
    query: BasePaginationQueryDto & { status?: PurchaseOrderStatus },
  ): Promise<ApiResponse<any>> {
    await this.getSupplierOrThrow(supplierId);

    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.purchaseOrderRepository
      .createQueryBuilder('po')
      .where('po.supplier_id = :supplierId', {
        supplierId,
      });

    if (query.status) {
      qb.andWhere('po.status = :status', {
        status: query.status,
      });
    }

    qb.orderBy('po.created_at', 'DESC');

    qb.skip(skip).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    return successResponse('Supplier purchase orders retrieved successfully', {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async getSupplierMetrics(): Promise<DashboardCard[]> {
    const [totalSuppliers, stats] = await Promise.all([
      this.supplierRepository.count(),

      this.purchaseOrderRepository
        .createQueryBuilder('po')
        .select(
          `
        SUM(
          CASE
            WHEN po.status = :sent
            THEN 1
            ELSE 0
          END
        )
      `,
          'outstandingOrders',
        )
        //   .addSelect(
        //     `
        //   SUM(
        //     CASE
        //       WHEN po.expectedDeliveryDate < CURRENT_TIMESTAMP
        //       AND po.status != :received
        //       THEN 1
        //       ELSE 0
        //     END
        //   )
        // `,
        //     'lateDeliveries',
        //   )
        .setParameters({
          sent: PurchaseOrderStatus.SENT_TO_SUPPLIER,
          // received: PurchaseOrderStatus.RECEIVED,
        })
        .getRawOne() as Promise<Record<string, any>>,
    ]);

    return [
      {
        id: 'total-suppliers',
        title: 'Total Suppliers',
        value: totalSuppliers,
        severity: 'info',
      },
      {
        id: 'outstanding-orders',
        title: 'Outstanding Orders',
        value: Number(stats?.outstandingOrders ?? 0),
        severity:
          Number(stats?.outstandingOrders ?? 0) > 0 ? 'warning' : 'success',
      },
      // {
      //   id: 'late-deliveries',
      //   title: 'Late Deliveries',
      //   value: Number(stats?.lateDeliveries ?? 0),
      //   severity: Number(stats?.lateDeliveries ?? 0) > 0 ? 'danger' : 'success',
      // },
    ];
  }
}
