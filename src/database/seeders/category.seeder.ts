import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';

import { PRODUCT_CATALOGS, ProductCatalogTemplate } from './factory/product';
import { BusinessBlueprint } from './business.seeder';

import {
  Product,
  ProductStatus,
} from '../../resources/products/entities/product.entity';
import { Category } from '../../resources/categories/entities/category.entity';
import { Supplier } from '../../resources/suppliers/entities/supplier.entity';
import { ProductSource } from '../../resources/product_sources/entities/product_source.entity';
import { MoneyUtil } from '../../common/utils/money.utils';

interface ProductNameCandidate {
  template: ProductCatalogTemplate;
  brand?: string;
  variant?: string;
  name: string;
}

interface BusinessCurrencyRow {
  currency: string;
}

export async function seedCategoryAndSuppliers(
  queryRunner: QueryRunner,
  businessId: string,
  bizBlueprint: BusinessBlueprint,
  counts: {
    categoryCount: number;
    supplierCount: number;
    productCount: number;
  },
) {
  // ============================================================
  // 0. RESOLVE BUSINESS CURRENCY AND PRODUCT CATALOG
  // ============================================================

  const businessRows: unknown = await queryRunner.query(
    `SELECT currency FROM businesses WHERE id = ? LIMIT 1`,
    [businessId],
  );

  if (
    !Array.isArray(businessRows) ||
    businessRows.length === 0 ||
    typeof businessRows[0]?.currency !== 'string'
  ) {
    throw new Error(`Could not resolve currency for business: ${businessId}`);
  }

  const currency = (businessRows[0] as BusinessCurrencyRow).currency;

  const minorUnitDigits = MoneyUtil.getMinorUnitDigits(currency);

  const catalogKey =
    bizBlueprint.catalogType in PRODUCT_CATALOGS
      ? bizBlueprint.catalogType
      : 'SUPERMARKET';

  const productCatalog = PRODUCT_CATALOGS[catalogKey];

  if (!productCatalog?.length) {
    throw new Error(
      `No product catalog found for business catalog type: ${bizBlueprint.catalogType}`,
    );
  }

  // ============================================================
  // 1. SEED CATEGORIES
  // ============================================================

  const categorySeedData: Partial<Category>[] = [];

  const catalogCategoryNames = [
    ...new Set(productCatalog.map((item) => item.category)),
  ];

  const totalCategories = Math.max(
    counts.categoryCount,
    catalogCategoryNames.length,
  );

  for (let c = 0; c < totalCategories; c++) {
    const baseCategory = catalogCategoryNames[c % catalogCategoryNames.length];

    const categoryName =
      c < catalogCategoryNames.length
        ? baseCategory
        : `${baseCategory} ${Math.floor(c / catalogCategoryNames.length) + 1}`;

    const category: Partial<Category> = {
      id: randomUUID(),
      name: categoryName,
      description: `${categoryName} products stocked by ${bizBlueprint.display_name}.`,
    };

    categorySeedData.push(category);

    await queryRunner.query(
      `
        INSERT INTO categories (id, business_id, name, description)
        VALUES (?, ?, ?, ?)
      `,
      [category.id, businessId, category.name, category.description],
    );
  }

  // ============================================================
  // 2. SEED SUPPLIERS
  // ============================================================

  const supplierSeedData: Partial<Supplier>[] = [];

  for (let sup = 0; sup < counts.supplierCount; sup++) {
    const uniqueId = faker.string.alphanumeric(5).toUpperCase();

    const supplier: Partial<Supplier> = {
      id: randomUUID(),
      name: `${faker.company.name()} (${bizBlueprint.prefix}-${uniqueId})`,
      phone_number: `+234${faker.string.numeric(10)}`,
      email: faker.internet.email().toLowerCase(),
      business_id: businessId,
    };

    supplierSeedData.push(supplier);

    await queryRunner.query(
      `
        INSERT INTO suppliers (id, name, phone_number, email, business_id)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        supplier.id,
        supplier.name,
        supplier.phone_number,
        supplier.email,
        supplier.business_id,
      ],
    );
  }

  // ============================================================
  // 3. BUILD PRODUCT NAME COMBINATIONS
  // ============================================================

  const productNameMap = new Map<string, ProductNameCandidate>();

  for (const template of productCatalog) {
    const brands = template.brands?.length ? template.brands : [''];
    const variants = template.variants?.length ? template.variants : [''];

    for (const brand of brands) {
      for (const variant of variants) {
        const name = [brand, template.name, variant].filter(Boolean).join(' ');

        const normalizedName = name.trim().toLowerCase();

        if (!productNameMap.has(normalizedName)) {
          productNameMap.set(normalizedName, {
            template,
            brand: brand || undefined,
            variant: variant || undefined,
            name,
          });
        }
      }
    }
  }

  const productNameCandidates = faker.helpers.shuffle(
    Array.from(productNameMap.values()),
  );

  if (productNameCandidates.length === 0 && counts.productCount > 0) {
    throw new Error(
      `No product name combinations available for ${bizBlueprint.display_name}.`,
    );
  }

  // ============================================================
  // 4. SEED PRODUCTS
  // ============================================================

  const productSeedData: Partial<Product>[] = [];
  const generatedSkus = new Set<string>();

  for (let prodIndex = 0; prodIndex < counts.productCount; prodIndex++) {
    const combinationIndex = prodIndex % productNameCandidates.length;

    const variationNumber = Math.floor(
      prodIndex / productNameCandidates.length,
    );

    const candidate = productNameCandidates[combinationIndex];

    if (!candidate) {
      throw new Error('Could not resolve product name candidate.');
    }

    const template = candidate.template;

    const productName =
      variationNumber === 0
        ? candidate.name
        : `${candidate.name} Variant ${variationNumber + 1}`;

    const category = categorySeedData.find(
      (cat) => cat.name === template.category,
    );

    if (!category?.id) {
      throw new Error(
        `Category "${template.category}" was not seeded for ${bizBlueprint.display_name}.`,
      );
    }

    const description = `${productName} stocked by ${bizBlueprint.display_name}.`;

    // Generate a major-unit amount using the currency's precision.
    const sellingPriceMajor = faker.number.float({
      min: template.minPrice,
      max: template.maxPrice,
      fractionDigits: minorUnitDigits,
    });

    // Convert to minor units before persisting.
    const sellingPriceMinor = MoneyUtil.toMinorUnits(
      sellingPriceMajor.toFixed(minorUnitDigits),
      currency,
    );

    if (!template.imageUrls?.length) {
      throw new Error(
        `No image URLs configured for product template: ${template.name}`,
      );
    }

    const imageUrl = faker.helpers.arrayElement(template.imageUrls);

    const images = [
      {
        url: imageUrl,
        publicId: `seed_product_${faker.string.alphanumeric(8)}`,
      },
    ];

    let sku: string;

    do {
      sku = `${bizBlueprint.prefix}-${faker.string.alphanumeric(6).toUpperCase()}`;
    } while (generatedSkus.has(sku));

    generatedSkus.add(sku);

    const defaultReorderPoint = faker.number.int({
      min: 5,
      max: 50,
    });

    const prod: Partial<Product> = {
      id: randomUUID(),
      name: productName,
      description,
      images,
      sku,
      selling_price: sellingPriceMinor.toString(),
      default_reorder_point: defaultReorderPoint,
      uom_type: template.uomType,
      uom_base_name: template.uomBaseName,
      uom_display_name: template.uomDisplayName,
      status: ProductStatus.ACTIVE,
      category_id: category.id,
      business_id: businessId,
    };

    productSeedData.push(prod);

    await queryRunner.query(
      `
        INSERT INTO products (
          id, name, description, images, sku, selling_price,
          default_reorder_point, uom_type, uom_base_name,
          uom_display_name, status, category_id, business_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        prod.id,
        prod.name,
        prod.description,
        JSON.stringify(prod.images),
        prod.sku,
        prod.selling_price,
        prod.default_reorder_point,
        prod.uom_type,
        prod.uom_base_name,
        prod.uom_display_name,
        prod.status,
        prod.category_id,
        prod.business_id,
      ],
    );
  }

  // ============================================================
  // 5. SEED PRODUCT SOURCES
  // ============================================================

  const productSourcesSeedData: Partial<ProductSource>[] = [];

  for (const prod of productSeedData) {
    if (!prod.id || prod.selling_price == null) {
      continue;
    }

    const targetedSuppliers =
      supplierSeedData.length > 0
        ? faker.helpers.arrayElements(supplierSeedData, {
            min: 1,
            max: Math.min(3, supplierSeedData.length),
          })
        : [];

    // Product selling_price is already stored in minor units.
    const sellingPriceMinor = BigInt(prod.selling_price);

    for (let i = 0; i < targetedSuppliers.length; i++) {
      const supplier = targetedSuppliers[i];

      if (!supplier.id) {
        continue;
      }

      const is_primary = i === 0;

      // Generate a markup percentage between 65% and 85%.
      // Using an integer avoids floating-point money calculations.
      const costMarkupPercent = faker.number.int({
        min: 65,
        max: 85,
      });

      // Calculate cost in minor units and round to the nearest minor unit.
      const calculatedWholesaleCost =
        (sellingPriceMinor * BigInt(costMarkupPercent) + 50n) / 100n;

      const vendorCode = (supplier.name ?? 'SUP')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 3);

      const supplierSku = `${vendorCode}-${faker.string.numeric(4)}`;

      const estimatedLeadTime = faker.number.int({
        min: 2,
        max: 10,
      });

      const sourceRecord: Partial<ProductSource> = {
        id: randomUUID(),
        product_id: prod.id,
        business_id: businessId,
        supplier_id: supplier.id,
        cost_price: calculatedWholesaleCost.toString(),
        supplier_sku: supplierSku,
        estimated_lead_time_days: estimatedLeadTime,
        is_primary,
      };

      productSourcesSeedData.push(sourceRecord);

      await queryRunner.query(
        `
          INSERT INTO product_sources (
            id, product_id, business_id, supplier_id,
            cost_price, supplier_sku, estimated_lead_time_days, is_primary
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          sourceRecord.id,
          sourceRecord.product_id,
          sourceRecord.business_id,
          sourceRecord.supplier_id,
          sourceRecord.cost_price,
          sourceRecord.supplier_sku,
          sourceRecord.estimated_lead_time_days,
          sourceRecord.is_primary,
        ],
      );
    }
  }

  return {
    categorySeedData,
    supplierSeedData,
    productSeedData,
    productSourcesSeedData,
  };
}
