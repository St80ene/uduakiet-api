import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { ITenantUser } from './tenant.seeder';
import { Store } from '../../resources/stores/entities/store.entity';
import { ProductSeedData } from './category.seeder';

export async function seedStoreStocksAndMovements(
  queryRunner: QueryRunner,
  businessId: string,
  currentScale: { storeCountPerBusiness: number },
  storeSeedData: Store[],
  productSeedData: ProductSeedData[],
  tenantUsers: ITenantUser[],
) {
  for (const store of storeSeedData) {
    const storeProducts = faker.helpers.arrayElements(
      productSeedData,
      currentScale.storeCountPerBusiness ?? 10,
    );

    for (const prod of storeProducts) {
      const stockId = randomUUID();
      const isOutOfStock = faker.datatype.boolean({ probability: 0.05 });
      const initialQty = isOutOfStock
        ? 0
        : faker.number.int({ min: 20, max: 250 });

      // 1. Insert Stock Record
      await queryRunner.query(
        `INSERT INTO stocks (id, business_id, store_id, product_id, current_quantity) VALUES (?, ?, ?, ?, ?)`,
        [stockId, businessId, store.id, prod.id, initialQty],
      );

      if (initialQty > 0) {
        // 2. Initial Opening Stock Movement
        await queryRunner.query(
          `
            INSERT INTO stock_movements (
              id, business_id, stock_id, quantity, quantity_before, quantity_after, direction, type, unit_cost_price, unit_selling_price, reason, created_by_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            randomUUID(),
            businessId,
            stockId,
            initialQty,
            0,
            initialQty,
            'IN',
            'INITIAL_STOCK',
            prod.cost_price,
            prod.selling_price,
            'Initial opening stock balance seeding',
            tenantUsers[0].id,
          ],
        );

        // 3. Operational Movements
        const operationalEventsCount = faker.number.int({ min: 2, max: 6 });
        let runningQty = initialQty;

        for (let e = 0; e < operationalEventsCount; e++) {
          const isSale = faker.datatype.boolean({ probability: 0.7 });
          const movementQty = isSale
            ? faker.number.int({ min: 1, max: Math.min(5, runningQty) })
            : faker.number.int({ min: 2, max: 15 });

          const direction = isSale ? 'OUT' : 'IN';
          const movementType = isSale ? 'SALE' : 'ADJUSTMENT';

          const qtyBefore = runningQty;
          const qtyAfter = isSale
            ? qtyBefore - movementQty
            : qtyBefore + movementQty;
          runningQty = qtyAfter;

          const storemanOrCashier = faker.helpers.arrayElement(tenantUsers);

          await queryRunner.query(
            `
              INSERT INTO stock_movements (
                id, business_id, stock_id, quantity, quantity_before, quantity_after, direction, type, unit_cost_price, unit_selling_price, reason, created_by_id
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              randomUUID(),
              businessId,
              stockId,
              movementQty,
              qtyBefore,
              qtyAfter,
              direction,
              movementType,
              prod.cost_price,
              prod.selling_price,
              isSale
                ? 'Point of sale transaction'
                : 'Periodic physical stock audit correction',
              storemanOrCashier.id,
            ],
          );
        }
      }
    }
  }
}
