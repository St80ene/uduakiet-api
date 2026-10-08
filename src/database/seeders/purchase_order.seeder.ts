import { AuditLogEntity } from './../../common/enum/audit_log.enum';
import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { Store } from '../../resources/stores/entities/store.entity';
import { Supplier } from '../../resources/suppliers/entities/supplier.entity';
import { ITenantUser } from './tenant.seeder';
import { AuditLog } from '../../resources/audit_logs/entities/audit_log.entity';
import { AuditLogAction } from '../../common/enum/audit_log.enum';
import { BusinessBlueprint, ScaleMetrics } from './business.seeder';
import { PurchaseOrderStatus } from '../../resources/purchase_orders/entities/purchase_order.entity';
import { ProductSource } from '../../resources/product_sources/entities/product_source.entity';

export async function seedPurchaseOrders(
  queryRunner: QueryRunner,
  businessId: string,
  bizBlueprint: BusinessBlueprint,
  storeSeedData: Partial<Store>[],
  supplierSeedData: Partial<Supplier>[],
  productSourcesSeedData: Partial<ProductSource>[],
  tenantUsers: ITenantUser[],
  tenantAdminUser: ITenantUser,
  currentScale: ScaleMetrics,
  auditLogBatch: Partial<AuditLog>[],
) {
  const poStatuses: PurchaseOrderStatus[] = Object.values(PurchaseOrderStatus);
  const poCountPerBusiness = currentScale.purchaseOrderCount ?? 10;

  console.log(
    `[Seeding] 📦 Starting purchase order generation for "${bizBlueprint.display_name}" (Target: ${poCountPerBusiness} POs)...`,
  );

  // Filter all product sources belonging to this business upfront
  const businessSources = productSourcesSeedData.filter(
    (src) => src.business_id === businessId,
  );

  if (businessSources.length === 0 || supplierSeedData.length === 0) {
    console.warn(
      `[Seeding] ⚠️ Skipping POs for "${bizBlueprint.display_name}": No product sources (${businessSources.length}) or suppliers (${supplierSeedData.length}) available.`,
    );
    return;
  }

  let successCount = 0;

  for (let i = 0; i < poCountPerBusiness; i++) {
    const poId = randomUUID();
    const poNumber = `PO-${bizBlueprint.prefix}-2026-${String(i + 1).padStart(3, '0')}`;

    // 1. Pick a random product source first, which guarantees a valid supplier link!
    const randomSource = faker.helpers.arrayElement(businessSources);
    const supplierId = randomSource.supplier_id;

    const supplier = supplierSeedData.find((s) => s.id === supplierId);
    if (!supplier) {
      console.warn(
        `[Seeding] ⚠️ Supplier ID ${supplierId} not found in seed cache. Skipping iteration ${i + 1}.`,
      );
      continue;
    }

    const status = faker.helpers.arrayElement(poStatuses);
    const store = faker.helpers.arrayElement(storeSeedData);
    const actingUser = faker.helpers.arrayElement(tenantUsers);

    // 2. Grab all valid sources for this specific supplier
    const validSourcesForSupplier = businessSources.filter(
      (src) => src.supplier_id === supplier.id,
    );

    // Determine sample boundaries safely
    const sampleSize = faker.number.int({
      min: Math.min(3, validSourcesForSupplier.length),
      max: Math.min(5, validSourcesForSupplier.length),
    });

    const chosenSources = faker.helpers.arrayElements(
      validSourcesForSupplier,
      sampleSize,
    );

    console.log(
      `[Seeding] 🔨 [${i + 1}/${poCountPerBusiness}] Creating ${poNumber} for "${bizBlueprint.display_name}" -> Supplier: "${supplier.name}" | Status: ${status} | Items: ${chosenSources.length}`,
    );

    let totalEstimatedCost = 0;

    // 3. Formulate individual purchase items
    const poItemsData = chosenSources.map((source) => {
      const qtyOrdered = faker.number.int({ min: 10, max: 100 });
      const qtyReceived =
        status === PurchaseOrderStatus.RECEIVED
          ? qtyOrdered
          : status === PurchaseOrderStatus.APPROVED
            ? Math.floor(qtyOrdered * 0.5)
            : 0;

      const unitCost = Number(source.cost_price) || 0;
      const totalCost = Number((qtyOrdered * unitCost).toFixed(2));
      totalEstimatedCost += totalCost;

      return {
        id: randomUUID(),
        product_id: source.product_id,
        quantity_requested: qtyOrdered,
        quantity_received: qtyReceived,
        estimated_unit_cost: unitCost,
        total_cost: totalCost,
      };
    });

    // ============================================================
    // HEADER INSERTION
    // ============================================================
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
        status === PurchaseOrderStatus.APPROVED ||
        status === PurchaseOrderStatus.RECEIVED
          ? tenantAdminUser.id
          : null,
      ],
    );

    // ============================================================
    // LINE ITEMS INSERTION
    // ============================================================
    for (const item of poItemsData) {
      await queryRunner.query(
        `
          INSERT INTO purchase_order_items (
            id, purchase_order_id, product_id, quantity_requested, quantity_received, estimated_unit_cost, total_cost
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.id,
          poId,
          item.product_id,
          item.quantity_requested,
          item.quantity_received,
          item.estimated_unit_cost,
          item.total_cost,
        ],
      );
    }

    // ============================================================
    // AUDIT LOGGING
    // ============================================================
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

    successCount++;
  }

  console.log(
    `[Seeding] ✅ Finished purchase orders for "${bizBlueprint.display_name}". Successfully seeded ${successCount}/${poCountPerBusiness} POs.`,
  );
}
