import {
  UomType,
  UomBaseName,
  UomDisplayName,
} from '../../../resources/products/entities/product.entity';

export interface ProductCatalogTemplate {
  name: string;
  category: string;
  brands: string[];
  minPrice: number;
  maxPrice: number;
  uomType: UomType;
  uomBaseName: UomBaseName;
  uomDisplayName: UomDisplayName;
  imageUrls: string[];
}

export const PRODUCT_CATALOGS: Record<string, ProductCatalogTemplate[]> = {
  SUPERMARKET: [
    {
      name: 'Full Cream Milk',
      category: 'Dairy & Beverages',
      brands: ['Peak', 'Milo', 'Ovaltine'],
      minPrice: 1500,
      maxPrice: 4500,
      uomType: UomType.UNIT,
      uomBaseName: UomBaseName.PCS,
      uomDisplayName: UomDisplayName.PCS,
      imageUrls: ['https://example.com/images/milk.jpg'],
    },
    {
      name: 'Spaghetti',
      category: 'Grains & Pasta',
      brands: ['Golden Penny', 'Dangote'],
      minPrice: 500,
      maxPrice: 1200,
      uomType: UomType.UNIT,
      uomBaseName: UomBaseName.PCS,
      uomDisplayName: UomDisplayName.PCS,
      imageUrls: ['https://example.com/images/spaghetti.jpg'],
    },
    {
      name: 'Vegetable Oil',
      category: 'Cooking Essentials',
      brands: ['Power Oil', 'Devon Kings'],
      minPrice: 2500,
      maxPrice: 9000,
      uomType: UomType.VOLUME,
      uomBaseName: UomBaseName.G,
      uomDisplayName: UomDisplayName.L,
      imageUrls: ['https://example.com/images/oil.jpg'],
    },
  ],

  HARDWARE: [
    {
      name: 'Claw Hammer',
      category: 'Hand Tools',
      brands: ['Total', 'Ingco', 'Stanley', 'Bosch'],
      minPrice: 3500,
      maxPrice: 12000,
      uomType: UomType.UNIT,
      uomBaseName: UomBaseName.PCS,
      uomDisplayName: UomDisplayName.PCS,
      imageUrls: ['https://example.com/images/hammer.jpg'],
    },
    {
      name: 'Adjustable Wrench',
      category: 'Hand Tools',
      brands: ['Total', 'Makita', 'DeWalt'],
      minPrice: 4000,
      maxPrice: 15000,
      uomType: UomType.UNIT,
      uomBaseName: UomBaseName.PCS,
      uomDisplayName: UomDisplayName.PCS,
      imageUrls: ['https://example.com/images/wrench.jpg'],
    },
  ],

  FASHION: [
    {
      name: 'Polo Shirt',
      category: 'Apparel',
      brands: ['Classic', 'Urban', 'Prime'],
      minPrice: 5000,
      maxPrice: 18000,
      uomType: UomType.UNIT,
      uomBaseName: UomBaseName.PCS,
      uomDisplayName: UomDisplayName.PCS,
      imageUrls: ['https://example.com/images/polo.jpg'],
    },
  ],

  // Fallback / Default for DISTRIBUTOR, PACKAGING, etc.
  DISTRIBUTOR: [
    {
      name: 'Bulk Merchandise Carton',
      category: 'General Goods',
      brands: ['Generic'],
      minPrice: 20000,
      maxPrice: 150000,
      uomType: UomType.UNIT,
      uomBaseName: UomBaseName.PCS,
      uomDisplayName: UomDisplayName.PCS,
      imageUrls: ['https://example.com/images/carton.jpg'],
    },
  ],

  PACKAGING: [
    {
      name: 'Corrugated Shipping Box',
      category: 'Packaging Materials',
      brands: ['Atlantic'],
      minPrice: 200,
      maxPrice: 1500,
      uomType: UomType.UNIT,
      uomBaseName: UomBaseName.PCS,
      uomDisplayName: UomDisplayName.PCS,
      imageUrls: ['https://example.com/images/box.jpg'],
    },
  ],
};
