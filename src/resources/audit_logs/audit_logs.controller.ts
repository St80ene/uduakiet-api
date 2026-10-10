import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AuditLogsService } from './audit_logs.service';
import { AuditLogQueryDto } from './dto/auditlog_query.dto';
import { UserRole } from '../../common/enum/user_role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.AUDIT_LOG_READ])
  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.AUDIT_LOG_READ])
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogsService.findOne(id);
  }
}
