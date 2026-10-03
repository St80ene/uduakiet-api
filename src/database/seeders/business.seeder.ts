import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';

export interface BusinessBlueprint {
  name: string;
  prefix: string;
  city: string;
  state: string;
}

export interface ScaleMetrics {
  businessCount: number;
  storeCountPerBusiness: number;
  categoryCount: number;
  supplierCount: number;
  productCount: number;
  usersPerBusiness: number;
  purchaseOrderCount: number;
}

export type BusinessSizeKeys = 'SMALL' | 'MEDIUM' | 'LARGE';

export type IBusinessSize = Record<BusinessSizeKeys, ScaleMetrics>;

export type CurrentScale = (typeof BUSINESS_SIZES)[typeof profileKey];

export const BUSINESS_SIZES: IBusinessSize = {
  SMALL: {
    businessCount: 2,
    storeCountPerBusiness: 1,
    categoryCount: 5,
    supplierCount: 5,
    productCount: 15,
    usersPerBusiness: 2,
    purchaseOrderCount: 5,
  },
  MEDIUM: {
    businessCount: 3,
    storeCountPerBusiness: 2,
    categoryCount: 10,
    supplierCount: 12,
    productCount: 40,
    usersPerBusiness: 5,
    purchaseOrderCount: 15,
  },
  LARGE: {
    businessCount: 5,
    storeCountPerBusiness: 4,
    categoryCount: 16,
    supplierCount: 25,
    productCount: 100,
    usersPerBusiness: 8,
    purchaseOrderCount: 30,
  },
};

export const BUSINESS_SIZE: keyof typeof BUSINESS_SIZES = 'MEDIUM'; // Options: SMALL, MEDIUM, LARGE

export const profileKey = (BUSINESS_SIZE?.toUpperCase() ||
  'MEDIUM') as keyof typeof BUSINESS_SIZES;

export const currentScale: CurrentScale =
  BUSINESS_SIZES[profileKey] || BUSINESS_SIZES.MEDIUM;

export const independentBusinessBlueprints = [
  {
    name: 'Ekenedilichukwu Supermarkets Ltd',
    prefix: 'EKS',
    city: 'Onitsha',
    state: 'Anambra',
  },
  {
    name: 'Calabar Fresh Foods & Provision',
    prefix: 'CFF',
    city: 'Calabar',
    state: 'Cross River',
  },
  {
    name: 'Oodua Hardware & General Stores',
    prefix: 'OHS',
    city: 'Ibadan',
    state: 'Oyo',
  },
  {
    name: 'Sahel Agro-Allied Ventures',
    prefix: 'SAV',
    city: 'Kano',
    state: 'Kano',
  },
  {
    name: 'Atlantic Maritime Supply Co',
    prefix: 'AMS',
    city: 'Lagos',
    state: 'Lagos',
  },
];

export async function seedBusinessTenant(
  queryRunner: QueryRunner,
  bizBlueprint: BusinessBlueprint,
  bIndex: number,
  profileKey: string,
): Promise<string> {
  const businessId = randomUUID();

  await queryRunner.query(
    `
      INSERT INTO businesses (
        id, legal_name, display_name, registration_number, tax_identification_number,
        business_type, email, phone_number, website, address_line_1, city, state, country,
        postal_code, currency, timezone, locale, settings
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      businessId,
      bizBlueprint.name,
      bizBlueprint.name,
      `RC-887766-${bIndex + 1}`,
      `TIN-112233-${bIndex + 1}`,
      'RETAIL',
      `admin@${bizBlueprint.prefix.toLowerCase()}store.ng`,
      faker.phone.number({ style: 'international' }),
      `https://${bizBlueprint.prefix.toLowerCase()}store.ng`,
      faker.location.streetAddress(),
      bizBlueprint.city,
      bizBlueprint.state,
      'NG',
      '100001',
      'NGN',
      'Africa/Lagos',
      'en-NG',
      JSON.stringify({
        tier: profileKey,
        tenantIndex: bIndex + 1,
        currencySymbol: '₦',
      }),
    ],
  );

  return businessId;
}
