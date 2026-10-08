import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { Store } from '../../resources/stores/entities/store.entity';
import { BusinessBlueprint } from './business.seeder';

export async function seedStoresForBusiness(
  queryRunner: QueryRunner,
  businessId: string,
  bizBlueprint: BusinessBlueprint,
  storeCount: number,
) {
  const storeSeedData: Store[] = [];
  for (let s = 0; s < storeCount; s++) {
    const storeId = randomUUID();
    const store: Store = {
      id: storeId,
      name: `${bizBlueprint?.prefix} Outlet ${s + 1}`,
      code: `${bizBlueprint?.prefix}-STR-${s + 1}`,
      address: faker.location.streetAddress(),
      city: bizBlueprint.city,
      state: bizBlueprint.state,
      country: 'NG',
      phone_number: faker.phone.number({ style: 'international' }),
      business_id: businessId,
      deleted_at: null,
    } as Store;

    storeSeedData.push(store);

    await queryRunner.query(
      `
        INSERT INTO stores (id, business_id, name, code, address, city, state, country, phone_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        store.id,
        businessId,
        store.name,
        store.code,
        store.address,
        store.city,
        store.state,
        store.country,
        store.phone_number,
      ],
    );
  }
  return storeSeedData;
}
