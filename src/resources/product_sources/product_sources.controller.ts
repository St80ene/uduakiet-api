import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductSourcesService } from './product_sources.service';
import { CreateProductSourceDto } from './dto/create-product_source.dto';
import { UpdateProductSourceDto } from './dto/update-product_source.dto';
import { ProductSourcePaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';

@Controller('product-sources')
export class ProductSourcesController {
  constructor(private readonly productSourcesService: ProductSourcesService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.PRODUCT_SOURCE_CREATE])
  @Post()
  create(
    @CurrentUser() { businessId }: AuthenticatedUser,
    @Body() createProductSourceDto: CreateProductSourceDto,
  ) {
    return this.productSourcesService.create(
      businessId,
      createProductSourceDto,
    );
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @UserRolePermissions([UserPermission.PRODUCT_SOURCE_READ])
  @Get()
  findAll(
    @Query() query: ProductSourcePaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productSourcesService.findAll(user.businessId, query);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @UserRolePermissions([UserPermission.PRODUCT_SOURCE_READ])
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productSourcesService.findOne(id);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.PRODUCT_SOURCE_UPDATE])
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductSourceDto: UpdateProductSourceDto,
  ) {
    return this.productSourcesService.update(id, updateProductSourceDto);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.PRODUCT_SOURCE_DELETE])
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productSourcesService.remove(id);
  }
}
