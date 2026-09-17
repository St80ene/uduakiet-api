import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AuditLogsService } from './audit_logs.service';
import { AuditLogQueryDto } from './dto/auditlog_query.dto';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogsService.findOne(id);
  }
}
