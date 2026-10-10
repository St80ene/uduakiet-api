import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';

import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

import {
  PaginationMeta,
  StorePaginationQueryDto,
} from '../../common/dto/pagination-query.dto';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

import { ApiResponse } from '../../common/utils/response.utils';
import { Store } from './entities/store.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.STORE_READ])
  @Get()
  findAll(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Query() paginationQuery: StorePaginationQueryDto,
  ): Promise<
    ApiResponse<{
      stores: Store[];
      meta: PaginationMeta;
    }>
  > {
    return this.storesService.findAll(businessId, paginationQuery);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @UserRolePermissions([UserPermission.STORE_READ])
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() { businessId }: AuthenticatedUser,
  ): Promise<ApiResponse<Store>> {
    return this.storesService.findOne(id, businessId);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.STORE_CREATE])
  @Post()
  create(
    @Body() createStoreDto: CreateStoreDto,
    @CurrentUser() { businessId }: AuthenticatedUser,
  ): Promise<ApiResponse<Store>> {
    return this.storesService.create(createStoreDto, businessId);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.STORE_UPDATE])
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Body() updateStoreDto: UpdateStoreDto,
  ): Promise<ApiResponse<Store>> {
    return this.storesService.update(id, businessId, updateStoreDto);
  }

  @Roles([UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.STORE_DELETE])
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() { businessId }: AuthenticatedUser,
  ): Promise<ApiResponse<null>> {
    return this.storesService.remove(id, businessId);
  }
}
