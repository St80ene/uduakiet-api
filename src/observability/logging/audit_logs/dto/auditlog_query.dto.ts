import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AuditLogEntity,
  AuditLogAction,
} from '../../../../common/enum/audit_log.enum';
import { MaxObjectSize } from '../../../../common/validators/max_object_size.validator';

export enum AuditLogSortBy {
  CREATED_AT = 'created_at',
  ACTION = 'action',
  ENTITY = 'entity',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsEnum(AuditLogEntity)
  entity?: AuditLogEntity;

  @IsOptional()
  @IsEnum(AuditLogAction)
  action?: AuditLogAction;

  @IsOptional()
  @IsObject()
  @MaxObjectSize(100)
  newValue?: Record<string, any>;

  @IsOptional()
  @IsObject()
  @MaxObjectSize(100)
  oldValue?: Record<string, any>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsEnum(AuditLogSortBy)
  sortBy: AuditLogSortBy = AuditLogSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.DESC;
}
