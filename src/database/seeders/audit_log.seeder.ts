import { QueryRunner } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { ITenantUser } from './tenant.seeder';
import { Store } from '../../resources/stores/entities/store.entity';
import { AuditLog } from '../../resources/audit_logs/entities/audit_log.entity';
import {
  AuditLogAction,
  AuditLogEntity,
} from '../../common/enum/audit_log.enum';

export async function seedGeneralAuditLogs(
  queryRunner: QueryRunner,
  businessId: string,
  tenantUsers: ITenantUser[],
  storeSeedData: Store[],
  auditLogBatch: Partial<AuditLog>[],
): Promise<void> {
  for (let a = 0; a < 15; a++) {
    const randomUser = faker.helpers.arrayElement(tenantUsers);
    const randomStore: Store = faker.helpers.arrayElement(storeSeedData);
    const actionsList = [
      {
        action: AuditLogAction.CREATE,
        entity: AuditLogEntity.PRODUCT,
        desc: 'Added new catalog item',
      },
      {
        action: AuditLogAction.UPDATE,
        entity: AuditLogEntity.STOCK,
        desc: 'Updated stock safety thresholds',
      },
      {
        action: AuditLogAction.CREATE,
        entity: AuditLogEntity.SUPPLIER,
        desc: 'Onboarded secondary supplier',
      },
      {
        action: AuditLogAction.UPDATE,
        entity: AuditLogEntity.USER,
        desc: 'Modified staff access roles',
      },
    ];
    const chosen = faker.helpers.arrayElement(actionsList);

    auditLogBatch.push({
      id: randomUUID(),
      business_id: businessId,
      store_id: randomStore.id,
      user_id: randomUser.id,
      action: chosen.action,
      entity: chosen.entity,
      entity_id: randomUUID(),
      old_value: null,
      new_value: { message: chosen.desc },
      metadata: {
        ip: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        reason: chosen.desc,
      },
    });
  }

  // Execute bulk insert for audit logs
  for (const log of auditLogBatch) {
    await queryRunner.query(
      `
        INSERT INTO audit_logs (
          id, business_id, store_id, user_id, action, entity, entity_id, old_value, new_value, metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        log.id,
        log.business_id,
        log.store_id,
        log.user_id,
        log.action,
        log.entity,
        log.entity_id,
        log.old_value ? JSON.stringify(log.old_value) : null,
        log.new_value ? JSON.stringify(log.new_value) : null,
        log.metadata ? JSON.stringify(log.metadata) : null,
      ],
    );
  }
}
