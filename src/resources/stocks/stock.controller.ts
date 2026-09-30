import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

import { StocksService } from './stock.service';

import { StockPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stockService: StocksService) {}

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
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.stockService.findOne(id, user);
  }

  /**
   * Get inventory/warehouse metrics.
   *
   * GET /stocks/metrics
   */
  @Get('metrics')
  getWarehouseMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.stockService.getWarehouseMetrics(user);
  }

  @Patch('adjustment')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpdateStockDto,
  ) {
    return this.stockService.update(payload, user);
  }
}
