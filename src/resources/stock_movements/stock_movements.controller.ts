import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { StockMovementsService } from './stock_movements.service';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CreateStockMovementDto } from './dto/create-stock_movement.dto';
import { StockMovementPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enum/user_role.enum';

@Controller('stock-movements')
@UseGuards(RolesGuard)
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  /**
   * Get all stock movements for the authenticated business.
   *
   * GET /stock-movements
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StockMovementPaginationQueryDto,
  ) {
    return this.stockMovementsService.findAll(user, query);
  }

  /**
   * Get one stock movement.
   *
   * GET /stock-movements/:id
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.stockMovementsService.findOne(id, user);
  }

  /**
   * Get all movements belonging to a stock balance.
   *
   * GET /stock-movements/stock/:stockId
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Get('stock/:stockId')
  findByStock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('stockId') stockId: string,
  ) {
    return this.stockMovementsService.findByStock(stockId, user);
  }

  /**
   * Get all movements for a product.
   *
   * GET /stock-movements/product/:productId
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Get('product/:productId')
  findByProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.stockMovementsService.findByProduct(productId, user);
  }

  /**
   * Create a stock movement and update the current stock balance.
   *
   * POST /stock-movements/movement
   *
   * The service performs both operations in one database transaction.
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Post('movement')
  createMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.stockMovementsService.createMovement(user, dto);
  }

  /**
   * Create multiple stock movements atomically.
   *
   * POST /stock-movements/movement/bulk
   */
  @Roles([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER])
  @Post('movement/bulk')
  bulkCreateMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dtos: CreateStockMovementDto[],
  ) {
    return this.stockMovementsService.bulkCreateMovements(user, dtos);
  }
}
