import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
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
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';

@Controller('stores')
@UseGuards(RolesGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
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
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() { businessId }: AuthenticatedUser,
  ): Promise<ApiResponse<Store>> {
    return this.storesService.findOne(id, businessId);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @Post()
  create(
    @Body() createStoreDto: CreateStoreDto,
    @CurrentUser() { businessId }: AuthenticatedUser,
  ): Promise<ApiResponse<Store>> {
    return this.storesService.create(createStoreDto, businessId);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Body() updateStoreDto: UpdateStoreDto,
  ): Promise<ApiResponse<Store>> {
    return this.storesService.update(id, businessId, updateStoreDto);
  }

  @Roles([UserRole.SUPER_ADMIN])
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() { businessId }: AuthenticatedUser,
  ): Promise<ApiResponse<null>> {
    return this.storesService.remove(id, businessId);
  }
}
