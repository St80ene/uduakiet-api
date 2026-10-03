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
  UseGuards,
} from '@nestjs/common';
import { ProductSourcesService } from './product_sources.service';
import { CreateProductSourceDto } from './dto/create-product_source.dto';
import { UpdateProductSourceDto } from './dto/update-product_source.dto';
import { ProductSourcePaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';

@Controller('product-sources')
@UseGuards(RolesGuard)
export class ProductSourcesController {
  constructor(private readonly productSourcesService: ProductSourcesService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
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
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productSourcesService.findOne(id);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductSourceDto: UpdateProductSourceDto,
  ) {
    return this.productSourcesService.update(id, updateProductSourceDto);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productSourcesService.remove(id);
  }
}
