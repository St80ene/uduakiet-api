import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';

/**
 * ============================================================
 * BUSINESS BLUEPRINT
 * ============================================================
 *
 * This mirrors the fields that actually exist on the Business
 * entity rather than introducing fields that don't exist in the
 * database.
 *
 * `catalogType` is seed-specific metadata. It is NOT persisted
 * to the businesses table. It tells the product seeder what kind
 * of products this business should have.
 */
export type SeedCatalogType =
  | 'SUPERMARKET'
  | 'PHARMACY'
  | 'RESTAURANT'
  | 'ELECTRONICS'
  | 'FASHION'
  | 'BAKERY'
  | 'FROZEN_FOOD'
  | 'COSMETICS'
  | 'CLEANING'
  | 'OFFICE_SUPPLIES'
  | 'PACKAGING'
  | 'DISTRIBUTOR'
  | 'HARDWARE';

export interface BusinessBlueprint {
  // ==========================================================
  // IDENTITY
  // ==========================================================

  legal_name: string;
  display_name: string;
  prefix: string;

  registration_number?: string;
  tax_identification_number?: string;
  business_type?: string;

  // Seed-only product catalog classification.
  catalogType: SeedCatalogType;

  // ==========================================================
  // CONTACT
  // ==========================================================

  email?: string;
  phone_number?: string;
  website?: string;

  // ==========================================================
  // ADDRESS
  // ==========================================================

  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;

  // ==========================================================
  // BRANDING
  // ==========================================================

  logo?: {
    url: string;
    publicId: string;
  } | null;

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  currency?: string;
  timezone?: string;
  locale?: string;

  tax_settings?: Record<string, unknown> | null;

  settings?: Record<string, unknown> | null;
}

/**
 * ============================================================
 * SCALE METRICS
 * ============================================================
 */

export interface ScaleMetrics {
  businessCount: number;
  storeCountPerBusiness: number;
  categoryCount: number;
  supplierCount: number;
  productCount: number;
  usersPerBusiness: number;
  purchaseOrderCount: number;

  /**
   * Number of products a particular store may carry.
   *
   * This is deliberately independent of storeCountPerBusiness.
   */
  minProductsPerStore: number;
  maxProductsPerStore: number;
}

export type BusinessSizeKeys = 'SMALL' | 'MEDIUM' | 'LARGE';

export type IBusinessSize = Record<BusinessSizeKeys, ScaleMetrics>;

/**
 * ============================================================
 * SEED SCALE CONFIGURATION
 * ============================================================
 */

export const BUSINESS_SIZE_CONFIGURATION: IBusinessSize = {
  SMALL: {
    /**
     * Example:
     * - neighbourhood supermarket
     * - pharmacy
     * - boutique
     * - mini-mart
     *
     * Usually one physical location.
     */
    businessCount: 5,

    storeCountPerBusiness: 1,

    categoryCount: 8,
    supplierCount: 10,

    /**
     * Business-level product catalogue.
     */
    productCount: 150,

    usersPerBusiness: 5,

    purchaseOrderCount: 20,

    /**
     * One store doesn't necessarily stock every product
     * in the business catalogue.
     */
    minProductsPerStore: 100,
    maxProductsPerStore: 150,
  },

  MEDIUM: {
    /**
     * Example:
     * - regional supermarket
     * - distributor
     * - electronics retailer
     * - multi-branch fashion business
     */
    businessCount: 3,

    storeCountPerBusiness: 3,

    categoryCount: 25,
    supplierCount: 35,
    productCount: 850,

    usersPerBusiness: 14,

    purchaseOrderCount: 75,

    minProductsPerStore: 500,
    maxProductsPerStore: 850,
  },

  LARGE: {
    /**
     * Example:
     * - large retail chain
     * - FMCG distributor
     * - national wholesaler
     */
    businessCount: 2,

    storeCountPerBusiness: 8,

    categoryCount: 60,
    supplierCount: 120,
    productCount: 4500,

    usersPerBusiness: 50,

    purchaseOrderCount: 350,

    minProductsPerStore: 2500,
    maxProductsPerStore: 4500,
  },
};

/**
 * ============================================================
 * ACTIVE PROFILE
 * ============================================================
 */

export const BUSINESS_SIZE: BusinessSizeKeys = 'SMALL';

export const profileKey: BusinessSizeKeys =
  BUSINESS_SIZE.toUpperCase() as BusinessSizeKeys;

export const currentScale: ScaleMetrics =
  BUSINESS_SIZE_CONFIGURATION[profileKey] ?? BUSINESS_SIZE_CONFIGURATION.MEDIUM;

/**
 * ============================================================
 * BUSINESS BLUEPRINTS
 * ============================================================
 *
 * These are deliberately different businesses so the seed
 * environment feels like a real Nigerian business ecosystem.
 *
 * `business_type` is the value persisted to Business.business_type.
 *
 * `catalogType` is seed metadata used later by the product
 * generator.
 */
export const independentBusinessBlueprints: BusinessBlueprint[] = [
  {
    legal_name: 'Ekenedilichukwu Supermarkets Ltd',
    display_name: 'Ekenedilichukwu Supermarkets',
    prefix: 'EKS',

    registration_number: 'RC-887766-001',
    tax_identification_number: 'TIN-112233-001',

    business_type: 'RETAIL',
    catalogType: 'SUPERMARKET',

    email: 'admin@ekenedilichukwusupermarkets.ng',
    phone_number: '+2348034567812',
    website: 'https://ekenedilichukwusupermarkets.ng',

    address_line_1: '12 Main Market Road',
    address_line_2: 'Near Ochanja Market',
    city: 'Onitsha',
    state: 'Anambra',
    country: 'NG',
    postal_code: '430001',

    currency: 'NGN',
    timezone: 'Africa/Lagos',
    locale: 'en-NG',

    tax_settings: {
      vatEnabled: true,
      vatRate: 7.5,
    },

    settings: {
      tier: 'SMALL',
      theme_color: '#fffff',
      tenantIndex: 1,
      currencySymbol: '₦',
      enable_notifications: true,
      timezone: 'Africa/Lagos',
    },
  },

  {
    legal_name: 'Calabar Fresh Foods & Provision',
    display_name: 'Calabar Fresh Foods',
    prefix: 'CFF',

    registration_number: 'RC-887766-002',
    tax_identification_number: 'TIN-112233-002',

    business_type: 'RETAIL',
    catalogType: 'SUPERMARKET',

    email: 'admin@calabarfreshfoods.ng',
    phone_number: '+2348056723491',
    website: 'https://calabarfreshfoods.ng',

    address_line_1: '18 Marian Road',
    address_line_2: 'Marian Junction',
    city: 'Calabar',
    state: 'Cross River',
    country: 'NG',
    postal_code: '540001',

    currency: 'NGN',
    timezone: 'Africa/Lagos',
    locale: 'en-NG',

    tax_settings: {
      vatEnabled: true,
      vatRate: 7.5,
    },

    settings: {
      tier: 'SMALL',
      theme_color: '#fffff',
      tenantIndex: 2,
      currencySymbol: '₦',
      enable_notifications: true,
      timezone: 'Africa/Lagos',
    },
  },

  {
    legal_name: 'Oodua Hardware & General Stores',
    display_name: 'Oodua Hardware',
    prefix: 'OHS',

    registration_number: 'RC-887766-003',
    tax_identification_number: 'TIN-112233-003',

    business_type: 'RETAIL',
    catalogType: 'HARDWARE',

    email: 'admin@ooduahardware.ng',
    phone_number: '+2348078912345',
    website: 'https://ooduahardware.ng',

    address_line_1: '24 Challenge Road',
    address_line_2: 'Challenge',
    city: 'Ibadan',
    state: 'Oyo',
    country: 'NG',
    postal_code: '200001',

    currency: 'NGN',
    timezone: 'Africa/Lagos',
    locale: 'en-NG',

    tax_settings: {
      vatEnabled: true,
      vatRate: 7.5,
    },

    settings: {
      tier: 'SMALL',
      theme_color: '#fffff',
      tenantIndex: 3,
      currencySymbol: '₦',
      enable_notifications: true,
      timezone: 'Africa/Lagos',
    },
  },

  {
    legal_name: 'Sahel Agro-Allied Ventures',
    display_name: 'Sahel Agro-Allied',
    prefix: 'SAV',

    registration_number: 'RC-887766-004',
    tax_identification_number: 'TIN-112233-004',

    business_type: 'DISTRIBUTION',
    catalogType: 'DISTRIBUTOR',

    email: 'admin@sahelagroallied.ng',
    phone_number: '+2348091234567',
    website: 'https://sahelagroallied.ng',

    address_line_1: '15 Airport Road',
    address_line_2: 'Sabon Gari',
    city: 'Kano',
    state: 'Kano',
    country: 'NG',
    postal_code: '700001',

    currency: 'NGN',
    timezone: 'Africa/Lagos',
    locale: 'en-NG',

    tax_settings: {
      vatEnabled: true,
      vatRate: 7.5,
    },

    settings: {
      tier: 'SMALL',
      theme_color: '#fffff',
      tenantIndex: 4,
      currencySymbol: '₦',
      enable_notifications: true,
      timezone: 'Africa/Lagos',
    },
  },

  {
    legal_name: 'Atlantic Maritime Supply Co',
    display_name: 'Atlantic Maritime Supply',
    prefix: 'AMS',

    registration_number: 'RC-887766-005',
    tax_identification_number: 'TIN-112233-005',

    business_type: 'WHOLESALE',
    catalogType: 'PACKAGING',

    email: 'admin@atlanticmaritimesupply.ng',
    phone_number: '+2348023456789',
    website: 'https://atlanticmaritimesupply.ng',

    address_line_1: '7 Creek Road',
    address_line_2: 'Apapa',
    city: 'Lagos',
    state: 'Lagos',
    country: 'NG',
    postal_code: '102272',

    currency: 'NGN',
    timezone: 'Africa/Lagos',
    locale: 'en-NG',

    tax_settings: {
      vatEnabled: true,
      vatRate: 7.5,
    },

    settings: {
      tier: 'SMALL',
      theme_color: '#fffff',
      tenantIndex: 5,
      currencySymbol: '₦',
      enable_notifications: true,
      timezone: 'Africa/Lagos',
    },
  },
];

/**
 * ============================================================
 * SEED BUSINESS
 * ============================================================
 */

export async function seedBusinessTenant(
  queryRunner: QueryRunner,
  bizBlueprint: BusinessBlueprint,
  bIndex: number,
  profileKey: string,
): Promise<string> {
  const businessId = randomUUID();

  /**
   * Generate a unique registration number if one wasn't supplied
   * by the blueprint.
   */
  const registrationNumber =
    bizBlueprint.registration_number ??
    `RC-${faker.string.numeric(6)}-${String(bIndex + 1).padStart(3, '0')}`;

  const taxIdentificationNumber =
    bizBlueprint.tax_identification_number ?? `TIN-${faker.string.numeric(8)}`;

  const phoneNumber =
    bizBlueprint.phone_number ?? `+234${faker.string.numeric(10)}`;

  const email =
    bizBlueprint.email ?? `admin@${bizBlueprint.prefix.toLowerCase()}store.ng`;

  const website =
    bizBlueprint.website ??
    `https://${bizBlueprint.prefix.toLowerCase()}store.ng`;

  await queryRunner.query(
    `
      INSERT INTO businesses (
        id,
        legal_name,
        display_name,
        registration_number,
        tax_identification_number,
        business_type,
        email,
        phone_number,
        website,
        address_line_1,
        address_line_2,
        city,
        state,
        country,
        postal_code,
        currency,
        timezone,
        locale,
        tax_settings,
        settings
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?
      )
    `,
    [
      businessId, // 1
      bizBlueprint.legal_name, // 2
      bizBlueprint.display_name, // 3
      registrationNumber, // 4
      taxIdentificationNumber, // 5
      bizBlueprint.business_type ?? 'RETAIL', // 6
      email, // 7
      phoneNumber, // 8
      website, // 9
      bizBlueprint.address_line_1 ?? null, // 10
      bizBlueprint.address_line_2 ?? null, // 11
      bizBlueprint.city ?? null, // 12
      bizBlueprint.state ?? null, // 13
      bizBlueprint.country ?? 'NG', // 14
      bizBlueprint.postal_code ?? null, // 15
      bizBlueprint.currency ?? 'NGN', // 16
      bizBlueprint.timezone ?? 'Africa/Lagos', // 17
      bizBlueprint.locale ?? 'en-NG', // 18
      JSON.stringify(bizBlueprint.tax_settings ?? {}), // 19 (tax_settings)
      JSON.stringify({
        // 20 (settings)
        ...(bizBlueprint.settings ?? {}),
        tier: profileKey,
        tenantIndex: bIndex + 1,
        currencySymbol: '₦',
        seedCatalogType: bizBlueprint.catalogType,
      }),
    ],
  );

  return businessId;
}
