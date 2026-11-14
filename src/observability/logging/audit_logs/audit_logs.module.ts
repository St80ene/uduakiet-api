import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit_logs.service';
import { AuditLogsController } from './audit_logs.controller';
import { AuditLog } from './entities/audit_log.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
