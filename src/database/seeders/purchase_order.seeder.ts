import { AuditLogEntity } from './../../common/enum/audit_log.enum';
import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { Store } from '../../resources/stores/entities/store.entity';
import { Supplier } from '../../resources/suppliers/entities/supplier.entity';
import { Product } from '../../resources/products/entities/product.entity';
import { ITenantUser } from './tenant.seeder';
import { AuditLog } from '../../resources/audit_logs/entities/audit_log.entity';
import { AuditLogAction } from '../../common/enum/audit_log.enum';
import { BusinessBlueprint, ScaleMetrics } from './business.seeder';

export async function seedPurchaseOrders(
  queryRunner: QueryRunner,
  businessId: string,
  bizBlueprint: BusinessBlueprint,
  storeSeedData: Partial<Store>[],
  supplierSeedData: Partial<Supplier>[],
  productSeedData: Partial<Product>[],
  tenantUsers: ITenantUser[],
  tenantAdminUser: ITenantUser,
  currentScale: ScaleMetrics,
  auditLogBatch: Partial<AuditLog>[],
) {
  const poStatuses = ['PENDING', 'APPROVED', 'RECEIVED', 'DRAFT', 'CANCELLED'];
  const poCountPerBusiness = currentScale.purchaseOrderCount ?? 10;

  for (let i = 0; i < poCountPerBusiness; i++) {
    const poId = randomUUID();
    const poNumber = `PO-${bizBlueprint.prefix}-2026-${String(i + 1).padStart(3, '0')}`;
    const supplier = faker.helpers.arrayElement(supplierSeedData);
    const status = faker.helpers.arrayElement(poStatuses);
    const store = faker.helpers.arrayElement(storeSeedData);
    const actingUser = faker.helpers.arrayElement(tenantUsers);

    const poProducts = faker.helpers.arrayElements(
      productSeedData,
      faker.number.int({ min: 3, max: 5 }),
    );
    let totalEstimatedCost = 0;

    const poItemsData = poProducts.map((prod) => {
      const qtyOrdered = faker.number.int({ min: 10, max: 100 });
      const qtyReceived =
        status === 'RECEIVED'
          ? qtyOrdered
          : status === 'APPROVED'
            ? Math.floor(qtyOrdered * 0.5)
            : 0;
      const unitCost = prod.cost_price ?? 0;
      const totalCost = Number((qtyOrdered * unitCost).toFixed(2));
      totalEstimatedCost += totalCost;

      return {
        id: randomUUID(),
        product_id: prod.id,
        quantity_requested: qtyOrdered,
        quantity_received: qtyReceived,
        estimated_unit_cost: unitCost,
        total_cost: totalCost,
      };
    });

    // Header
    await queryRunner.query(
      `
        INSERT INTO purchase_orders (
          id, po_number, store_id, supplier_id, business_id, status, total_estimated_cost, created_by_id, approved_by_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        poId,
        poNumber,
        store.id,
        supplier.id,
        businessId,
        status,
        Number(totalEstimatedCost).toFixed(2),
        actingUser.id,
        status === 'APPROVED' || status === 'RECEIVED'
          ? tenantAdminUser.id
          : null,
      ],
    );

    // Items
    for (const item of poItemsData) {
      await queryRunner.query(
        `
          INSERT INTO purchase_order_items (
            id, purchase_order_id, product_id, quantity_requested, estimated_unit_cost, total_cost
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          item.id,
          poId,
          item.product_id,
          item.quantity_requested,
          item.estimated_unit_cost,
          item.total_cost,
        ],
      );
    }

    // Audit Log for PO Creation
    auditLogBatch.push({
      id: randomUUID(),
      business_id: businessId,
      store_id: store.id,
      user_id: actingUser.id,
      action: AuditLogAction.CREATE,
      entity: AuditLogEntity.PURCHASE_ORDER,
      entity_id: poId,
      old_value: null,
      new_value: { poNumber, status, totalEstimatedCost },
      metadata: {
        ip: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        reason: `Generated purchase order ${poNumber} with status ${status}`,
      },
    });
  }
}
