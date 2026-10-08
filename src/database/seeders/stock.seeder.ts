import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { ITenantUser } from './tenant.seeder';
import { Store } from '../../resources/stores/entities/store.entity';
import { ProductSource } from '../../resources/product_sources/entities/product_source.entity';
import { Product } from '../../resources/products/entities/product.entity';
import {
  StockMovementDirection,
  StockMovementType,
} from '../../resources/stock_movements/entities/stock_movement.entity';

export async function seedStoreStocksAndMovements(
  queryRunner: QueryRunner,
  businessId: string,
  currentScale: {
    storeCountPerBusiness: number;
    productCount: number;
    minProductsPerStore?: number;
    maxProductsPerStore?: number;
  },
  storeSeedData: Store[],
  productSeedData: Partial<Product>[],
  productSourcesSeedData: Partial<ProductSource>[],
  tenantUsers: ITenantUser[],
) {
  if (productSeedData.length === 0) {
    console.warn(
      `No products available for business ${businessId}. Skipping stock seeding.`,
    );

    return;
  }

  if (storeSeedData.length === 0) {
    console.warn(
      `No stores available for business ${businessId}. Skipping stock seeding.`,
    );

    return;
  }

  console.log(
    `Seeding stocks for ${storeSeedData.length} stores using ${productSeedData.length} products.`,
  );

  for (const store of storeSeedData) {
    /**
     * ============================================================
     * DETERMINE PRODUCTS FOR THIS STORE
     * ============================================================
     *
     * The number of stores should NOT determine how many products
     * a store carries.
     *
     * Example:
     *
     * 1 store  + 150 products → that store may carry 120 products
     * 3 stores + 150 products → each store may carry 100–140 products
     *
     * If no range is configured, default to the full catalog.
     */

    const minProductsPerStore = Math.max(
      1,
      Math.min(
        currentScale.minProductsPerStore ?? productSeedData.length,
        productSeedData.length,
      ),
    );

    const maxProductsPerStore = Math.max(
      minProductsPerStore,
      Math.min(
        currentScale.maxProductsPerStore ?? productSeedData.length,
        productSeedData.length,
      ),
    );

    const productCountForStore = faker.number.int({
      min: minProductsPerStore,
      max: maxProductsPerStore,
    });

    const storeProducts = faker.helpers.arrayElements(
      productSeedData,
      productCountForStore,
    );

    console.log(`Store ${store.id}: seeding ${storeProducts.length} products`);

    /**
     * ============================================================
     * CREATE STOCK FOR EACH PRODUCT IN THIS STORE
     * ============================================================
     */

    for (const prod of storeProducts) {
      if (!prod.id) {
        console.warn(`Skipping product without ID for store ${store.id}.`);

        continue;
      }

      const stockId = randomUUID();

      const isOutOfStock = faker.datatype.boolean({
        probability: 0.05,
      });

      const initialQty = isOutOfStock
        ? 0
        : faker.number.int({
            min: 20,
            max: 250,
          });

      /**
       * ============================================================
       * LOCATE PRODUCT SOURCE
       * ============================================================
       */

      const validSources = productSourcesSeedData.filter(
        (src) => src.product_id === prod.id && src.business_id === businessId,
      );

      const chosenSource =
        validSources.length > 0
          ? faker.helpers.arrayElement(validSources)
          : null;

      /**
       * Keep this value consistently numeric.
       */
      const unitCostPrice = chosenSource
        ? Number(chosenSource.cost_price)
        : Number(((Number(prod.selling_price) || 0) * 0.75).toFixed(2));

      /**
       * ============================================================
       * INSERT STOCK RECORD
       * ============================================================
       */

      await queryRunner.query(
        `
          INSERT INTO stocks (
            id,
            business_id,
            store_id,
            product_id,
            current_quantity
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        [stockId, businessId, store.id, prod.id, initialQty],
      );

      /**
       * ============================================================
       * INITIAL OPENING STOCK MOVEMENT
       * ============================================================
       */

      if (initialQty > 0) {
        await queryRunner.query(
          `
            INSERT INTO stock_movements (
              id,
              business_id,
              stock_id,
              quantity,
              quantity_before,
              quantity_after,
              direction,
              type,
              unit_cost_price,
              unit_selling_price,
              reason,
              created_by_id
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
            StockMovementDirection.IN,
            StockMovementType.INITIAL_STOCK,
            unitCostPrice,
            prod.selling_price,
            'Initial opening stock balance seeding',
            tenantUsers[0].id,
          ],
        );

        /**
         * ============================================================
         * OPERATIONAL STOCK MOVEMENTS
         * ============================================================
         */

        const operationalEventsCount = faker.number.int({
          min: 2,
          max: 6,
        });

        let runningQty = initialQty;

        for (let e = 0; e < operationalEventsCount; e++) {
          /**
           * Don't generate a sale when there is no stock available.
           */
          const canMakeSale = runningQty > 0;

          const isSale =
            canMakeSale &&
            faker.datatype.boolean({
              probability: 0.7,
            });

          let movementQty: number;

          if (isSale) {
            movementQty = faker.number.int({
              min: 1,
              max: Math.min(5, runningQty),
            });
          } else {
            movementQty = faker.number.int({
              min: 2,
              max: 15,
            });
          }

          const direction = isSale
            ? StockMovementDirection.OUT
            : StockMovementDirection.IN;

          const movementType = isSale
            ? StockMovementType.SALE
            : StockMovementType.ADJUSTMENT;

          const qtyBefore = runningQty;

          const qtyAfter = isSale
            ? qtyBefore - movementQty
            : qtyBefore + movementQty;

          runningQty = qtyAfter;

          const storemanOrCashier = faker.helpers.arrayElement(tenantUsers);

          await queryRunner.query(
            `
              INSERT INTO stock_movements (
                id,
                business_id,
                stock_id,
                quantity,
                quantity_before,
                quantity_after,
                direction,
                type,
                unit_cost_price,
                unit_selling_price,
                reason,
                created_by_id
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
              unitCostPrice,
              prod.selling_price,
              isSale
                ? 'Point of sale transaction'
                : 'Periodic physical stock audit correction',
              storemanOrCashier.id,
            ],
          );
        }

        /**
         * ============================================================
         * VERIFY FINAL STOCK BALANCE
         * ============================================================
         *
         * runningQty represents the balance implied by the movement
         * ledger. Use it as the authoritative final stock quantity.
         */

        await queryRunner.query(
          `
            UPDATE stocks
            SET current_quantity = ?
            WHERE id = ?
          `,
          [runningQty, stockId],
        );
      }
    }
  }
}
