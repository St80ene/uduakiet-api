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

interface ProductNameCandidate {
  template: ProductCatalogTemplate;
  brand?: string;
  variant?: string;
  name: string;
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
  // 0. RESOLVE BUSINESS PRODUCT CATALOG
  // ============================================================
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

  // Ensure every catalog category exists so products do not
  // accidentally fall back to an unrelated category.
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
  // Generate combinations from the catalog instead of randomly
  // choosing a template on every iteration. This makes it possible
  // to use different products, brands, and package variations.
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

  // Track generated SKUs to avoid collisions within this seed run.
  const generatedSkus = new Set<string>();

  for (let prodIndex = 0; prodIndex < counts.productCount; prodIndex++) {
    // Cycle through every available combination before reusing one.
    // If more products are requested than the catalog can uniquely
    // name, add a numbered variation to preserve name uniqueness.
    const combinationIndex = prodIndex % productNameCandidates.length;

    const variationNumber = Math.floor(
      prodIndex / productNameCandidates.length,
    );

    const candidate = productNameCandidates[combinationIndex];
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

    const sellingPrice = faker.number.float({
      min: template.minPrice,
      max: template.maxPrice,
      fractionDigits: 2,
    });

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
      selling_price: sellingPrice,
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

    for (const supplier of targetedSuppliers) {
      if (!supplier.id) {
        continue;
      }

      // Estimate a supplier cost below the retail selling price.
      const costMarkupFactor = faker.number.float({
        min: 0.65,
        max: 0.85,
        fractionDigits: 2,
      });

      const calculatedWholesaleCost = Number(
        (prod.selling_price * costMarkupFactor).toFixed(2),
      );

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
        cost_price: calculatedWholesaleCost,
        supplier_sku: supplierSku,
        estimated_lead_time_days: estimatedLeadTime,
      };

      productSourcesSeedData.push(sourceRecord);

      await queryRunner.query(
        `
          INSERT INTO product_sources (
            id, product_id, business_id, supplier_id,
            cost_price, supplier_sku, estimated_lead_time_days
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          sourceRecord.id,
          sourceRecord.product_id,
          sourceRecord.business_id,
          sourceRecord.supplier_id,
          sourceRecord.cost_price,
          sourceRecord.supplier_sku,
          sourceRecord.estimated_lead_time_days,
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
