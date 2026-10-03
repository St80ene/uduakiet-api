import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

import { StocksService } from './stock.service';

import { StockPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../common/enum/user_role.enum';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('stocks')
@UseGuards(RolesGuard)
export class StocksController {
  constructor(private readonly stockService: StocksService) {}

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateStockDto,
  ) {
    return this.stockService.create(payload, user);
  }
  /**
   * Get paginated current stock balances.
   *
   * GET /stocks
   *
   * This returns CURRENT inventory balances.
   * It does not return the stock movement ledger.
   */
  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() paginationQuery: StockPaginationQueryDto,
  ) {
    return this.stockService.findAll(user, paginationQuery);
  }

  /**
   * Get a single current stock balance.
   *
   * GET /stocks/:id
   */
  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.stockService.findOne(id, user);
  }

  /**
   * Get inventory/warehouse metrics.
   *
   * GET /stocks/metrics
   */
  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @Get('metrics')
  getWarehouseMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.stockService.getWarehouseMetrics(user);
  }

  @Roles([
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.STOREMAN,
  ])
  @Patch('adjustment')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpdateStockDto,
  ) {
    return this.stockService.update(payload, user);
  }
}
