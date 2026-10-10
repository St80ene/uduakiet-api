import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.SUPPLIER_CREATE])
  @Post()
  create(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.create(createSupplierDto, user.businessId);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @UserRolePermissions([UserPermission.SUPPLIER_READ])
  @Get()
  findAll(@Query() query: SupplierQueryDto) {
    return this.suppliersService.findAll(query);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.SUPPLIER_READ])
  @Get('metrics')
  getSupplierMetrics() {
    return this.suppliersService.getSupplierMetrics();
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @UserRolePermissions([UserPermission.SUPPLIER_READ])
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
    UserRole.SUPPLIER,
  ])
  @Patch(':id')
  @UserRolePermissions([UserPermission.SUPPLIER_UPDATE])
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.SUPPLIER_DELETE])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
