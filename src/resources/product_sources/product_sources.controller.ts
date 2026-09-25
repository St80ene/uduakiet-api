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

@Controller('product-sources')
export class ProductSourcesController {
  constructor(private readonly productSourcesService: ProductSourcesService) {}

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

  @Get()
  findAll(
    @Query() query: ProductSourcePaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productSourcesService.findAll(user.businessId, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productSourcesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductSourceDto: UpdateProductSourceDto,
  ) {
    return this.productSourcesService.update(id, updateProductSourceDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productSourcesService.remove(id);
  }
}
