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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('sales-orders')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @RequirePermissions('sales:create')
  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.salesOrdersService.create(companyId, dto);
  }

  @RequirePermissions('sales:view')
  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.salesOrdersService.findAll(companyId, query);
  }

  @RequirePermissions('sales:view')
  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.salesOrdersService.findOne(companyId, id);
  }

  @RequirePermissions('sales:cancel')
  @Patch(':id/cancel')
  cancel(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.salesOrdersService.cancel(companyId, id);
  }
}
