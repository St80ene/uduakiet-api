import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  // Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  BasePaginationQueryDto,
  PaginationMeta,
} from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ApiResponse } from '../../common/utils/response.utils';
import { Category } from './entities/category.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('categories')
@UseGuards(RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles([
    UserRole.CASHIER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SUPER_ADMIN,
    UserRole.STOREMAN,
  ])
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() paginationQuery: BasePaginationQueryDto,
  ): Promise<
    ApiResponse<{
      categories: Category[];
      meta: PaginationMeta;
    }>
  > {
    return this.categoriesService.findAll(user.businessId, paginationQuery);
  }

  @Roles([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
    UserRole.CASHIER,
  ])
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Category>> {
    return this.categoriesService.findOne(id, user.businessId);
  }

  @Roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER])
  @Post()
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponse<Category>> {
    return this.categoriesService.create(createCategoryDto, user.businessId);
  }

  @Roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<ApiResponse<Category>> {
    return this.categoriesService.update(
      id,
      user.businessId,
      updateCategoryDto,
    );
  }

  // @Delete(':id')
  // remove(
  //   @Param('id') id: string,
  //   @CurrentUser() user: AuthenticatedUser,
  // ): Promise<ApiResponse<null>> {
  //   return this.categoriesService.remove(id, user.businessId);
  // }
}
