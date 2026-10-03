import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { BusinessBlueprint } from './business.seeder';
import { Category } from '../../resources/categories/entities/category.entity';
import { Supplier } from '../../resources/suppliers/entities/supplier.entity';
import {
  Product,
  ProductStatus,
  UomBaseName,
  UomDisplayName,
  UomType,
} from '../../resources/products/entities/product.entity';

export type ProductSeedData = Partial<Product> & { id: string };

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
  // Categories
  const categorySeedData: Partial<Category>[] = [];
  for (let c = 0; c < counts.categoryCount; c++) {
    const cat = {
      id: randomUUID(),
      name: `${bizBlueprint.prefix} Cat ${c + 1}`,
      description: faker.commerce.productDescription(),
    };
    categorySeedData.push(cat);
    await queryRunner.query(
      `INSERT INTO categories (id, business_id, name, description) VALUES (?, ?, ?, ?)`,
      [cat.id, businessId, cat.name, cat.description],
    );
  }

  // Suppliers
  const supplierSeedData: Partial<Supplier>[] = [];
  for (let sup = 0; sup < counts.supplierCount; sup++) {
    const supplier = {
      id: randomUUID(),
      name: `${faker.company.name()} (${bizBlueprint.prefix})`,
      phone_number: faker.phone.number({ style: 'international' }),
      email: faker.internet.email(),
      business_id: businessId,
    };
    supplierSeedData.push(supplier);
    await queryRunner.query(
      `INSERT INTO suppliers (id, name, phone_number, email, business_id) VALUES (?, ?, ?, ?, ?)`,
      [
        supplier.id,
        supplier.name,
        supplier.phone_number,
        supplier.email,
        businessId,
      ],
    );
  }

  // Products
  const productSeedData: ProductSeedData[] = [];
  for (let p = 0; p < counts.productCount; p++) {
    const costPrice = faker.number.float({
      min: 200,
      max: 50000,
      fractionDigits: 2,
    });
    const sellingPrice = Number((costPrice * 1.25).toFixed(2));
    const category = faker.helpers.arrayElement(categorySeedData);

    const prodId = randomUUID();
    const prod = {
      id: prodId,
      business_id: businessId,
      category_id: category.id,
      name: `${bizBlueprint.prefix} Item ${p + 1}`,
      description: faker.commerce.productDescription(),
      images: [],
      cost_price: costPrice,
      selling_price: sellingPrice,
      uom_type: UomType.UNIT,
      uom_base_name: UomBaseName.PCS,
      uom_display_name: UomDisplayName.PCS,
      status: ProductStatus.ACTIVE,
      default_reorder_point: 10,
    };

    productSeedData.push(prod);

    await queryRunner.query(
      `
        INSERT INTO products (
          id, name, description, images, cost_price, selling_price,
          uom_type, uom_base_name, uom_display_name, status, category_id, business_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        prod.id,
        prod.name,
        prod.description,
        JSON.stringify(prod.images),
        prod.cost_price,
        prod.selling_price,
        prod.uom_type,
        prod.uom_base_name,
        prod.uom_display_name,
        prod.status,
        prod.category_id,
        prod.business_id,
      ],
    );
  }

  // Product Sources
  for (const prod of productSeedData) {
    const supplier = faker.helpers.arrayElement(supplierSeedData);
    await queryRunner.query(
      `INSERT INTO product_sources (id, business_id, product_id, supplier_id) VALUES (?, ?, ?, ?)`,
      [randomUUID(), businessId, prod.id, supplier.id],
    );
  }

  return { categorySeedData, supplierSeedData, productSeedData };
}
