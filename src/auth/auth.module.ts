import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../resources/users/entities/user.entity';
import { APP_GUARD } from '@nestjs/core';
import { UserAuth } from './entities/user_auth.entity';
import { AuditLog } from '../resources/audit_logs/entities/audit_log.entity';
import { AuditLogsModule } from '../resources/audit_logs/audit_logs.module';
import { Role } from './entities/role.entity';
import { RolePermissions } from './entities/role_permissions.entity';
import { Permission } from './entities/permission.entity';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshStrategy } from './strategies/refresh_jwt.strategy';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserAuth,
      AuditLog,
      Role,
      RolePermissions,
      Permission,
    ]),
    AuditLogsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ConfigService,
    JwtService,
    JwtStrategy,
    JwtRefreshStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
