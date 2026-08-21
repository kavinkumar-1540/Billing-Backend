import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller()
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get('inventory/stock')
  findStockLevels(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.stockMovementsService.findStockLevels(companyId, query);
  }

  @Get('inventory/movements')
  findMovements(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: ListMovementsQueryDto,
  ) {
    return this.stockMovementsService.findMovements(
      companyId,
      query.itemId,
      query,
    );
  }

  @Post('inventory/adjustments')
  createAdjustment(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    return this.stockMovementsService.createAdjustment(companyId, userId, dto);
  }
}
