import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateAuditLogDto } from './dto/create-audit_log.dto';
import { AuditLogQueryDto } from './dto/auditlog_query.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit_log.entity';
import { AuditLogEntity } from '../../common/enum/audit_log.enum';
import {
  BasePaginationQueryDto,
  PaginationMeta,
} from '../../common/dto/pagination-query.dto';
import { getPaginationOptions } from '../../common/utils/helpers/get_pagination_options.util';
import {
  ApiResponse,
  successResponse,
} from '../../common/utils/response.utils';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(
    createAuditLogDto: CreateAuditLogDto,
    user?: Partial<AuthenticatedUser>,
  ): Promise<AuditLog> {
    const payload = {
      ...createAuditLogDto,
      business_id: user?.businessId,
      store_id: user?.storeId,
    };
    const auditLog = this.auditLogRepository.create(payload);

    return await this.auditLogRepository.save(auditLog);
  }

  async findAll(query: AuditLogQueryDto): Promise<
    ApiResponse<{
      audit_logs: AuditLog[];
      meta: PaginationMeta;
    }>
  > {
    const {
      page,
      newValue,
      oldValue,
      limit,
      sortBy,
      order,
      userId,
      entity,
      entityId,
      action,
    } = query;

    const queryBuilder = this.auditLogRepository.createQueryBuilder('auditLog');

    if (userId) {
      queryBuilder.andWhere('auditLog.user_id = :userId', { userId });
    }

    if (entity) {
      queryBuilder.andWhere('auditLog.entity = :entity', { entity });
    }

    if (entityId) {
      queryBuilder.andWhere('auditLog.entity_id = :entityId', { entityId });
    }

    if (action) {
      queryBuilder.andWhere('auditLog.action = :action', { action });
    }

    if (oldValue) {
      queryBuilder.andWhere('auditLog.old_value = :oldValue', { oldValue });
    }

    if (newValue) {
      queryBuilder.andWhere('auditLog.new_value = :newValue', { newValue });
    }

    queryBuilder.orderBy(`auditLog.${sortBy}`, order);

    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return successResponse('Audit Logs fetched successfully', {
      audit_logs: data,
      meta: {
        totalItems: total,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  }

  async findOne(id: string): Promise<ApiResponse<AuditLog>> {
    const auditLog = await this.auditLogRepository.findOne({
      where: { id },
    });

    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID "${id}" not found.`);
    }

    return successResponse('Audit Log retrieved successfully', auditLog);
  }

  async getEntityAuditLogs(
    entity: AuditLogEntity,
    entityId: string,
    query: BasePaginationQueryDto,
  ): Promise<
    ApiResponse<{
      auditLogs: AuditLog[];
      meta: PaginationMeta;
    }>
  > {
    const {
      page: pageNumber,
      limit: limitNumber,
      skip,
    } = getPaginationOptions(query);

    const [data, total] = await this.auditLogRepository.findAndCount({
      where: {
        entity,
        entity_id: entityId,
      },
      order: {
        created_at: 'DESC',
      },
      skip,
      take: limitNumber,
    });

    return successResponse('Audit logs retrieved successfully', {
      auditLogs: data,
      meta: {
        totalItems: total,
        itemsPerPage: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        currentPage: pageNumber,
        hasNextPage: pageNumber * limitNumber < total,
        hasPreviousPage: pageNumber > 1,
      },
    });
  }
}
