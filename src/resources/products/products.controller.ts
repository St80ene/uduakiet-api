import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  ParseUUIDPipe,
  UploadedFiles,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  PaginationMeta,
  ProductPaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ApiResponse } from '../../common/utils/response.utils';
import { AuditLog } from '../audit_logs/entities/audit_log.entity';
import { Product } from './entities/product.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';
import { UserPermission } from '../../common/enum/user_permission.enum';
import { UserRolePermissions } from '../../common/decorators/role_permission.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @UserRolePermissions([UserPermission.PRODUCT_CREATE])
  @Post()
  @UseInterceptors(FilesInterceptor('images', 5)) // ◄ Allow up to 5 images
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 }) // 5MB
        .build({
          fileIsRequired: false,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    files?: Express.Multer.File[],
  ): Promise<ApiResponse<Product>> {
    return this.productsService.create(createProductDto, currentUser, files);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
    UserRole.CASHIER,
  ])
  @UserRolePermissions([UserPermission.PRODUCT_READ])
  @Get()
  findAll(
    @Query() paginationQuery: ProductPaginationQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiResponse<{ products: Product[]; meta: PaginationMeta }>> {
    return this.productsService.findAll(paginationQuery, currentUser);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
    UserRole.CASHIER,
  ])
  @UserRolePermissions([UserPermission.PRODUCT_READ])
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiResponse<Product>> {
    return this.productsService.findOne(id, currentUser);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @UserRolePermissions([UserPermission.PRODUCT_AUDIT_LOG_READ])
  @Get(':id/audit-logs')
  getProductAuditLogs(
    @Param('id', ParseUUIDPipe) productId: string,
    @Query() query: ProductPaginationQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<
    ApiResponse<{
      auditLogs: AuditLog[];
      meta: PaginationMeta;
    }>
  > {
    return this.productsService.getProductAuditLogs(
      productId,
      currentUser,
      query,
    );
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @UserRolePermissions([UserPermission.PRODUCT_READ])
  @Get('inventory-health')
  getInventoryHealth(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.productsService.getInventoryHealth(currentUser);
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 5))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<ApiResponse<Product>> {
    return this.productsService.update(
      id,
      updateProductDto,
      currentUser,
      files,
    );
  }

  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN])
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ApiResponse<null>> {
    return this.productsService.remove(id, currentUser);
  }

  /**
   * Get current stock for a product.
   *
   * GET /products/stock/:productId
   *
   * Returns the stock balance for the authenticated user's store.
   */
  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
    UserRole.CASHIER,
  ])
  @Get('stock/:productId')
  findCurrentStock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.productsService.findCurrentProductStock(productId, user);
  }

  /**
   * Get stock movement history for a product.
   *
   * GET /products/stock/:productId/history
   *
   * Returns the immutable inventory ledger for the product.
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Get('stock/:productId/history')
  findProductStockHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.productsService.findProductStockHistory(productId, user);
  }
}
