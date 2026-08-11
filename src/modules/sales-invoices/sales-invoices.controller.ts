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
import { SalesInvoicesService } from './sales-invoices.service';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { ConvertOrderDto } from './dto/convert-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('sales-invoices')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@Controller('sales-invoices')
export class SalesInvoicesController {
  constructor(private readonly salesInvoicesService: SalesInvoicesService) {}

  @RequirePermissions('sales:create')
  @Post()
  issue(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSalesInvoiceDto,
  ) {
    return this.salesInvoicesService.issue(companyId, userId, dto);
  }

  @RequirePermissions('sales:create')
  @Post('from-order/:salesOrderId')
  convertFromOrder(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('salesOrderId') salesOrderId: string,
    @Body() dto: ConvertOrderDto,
  ) {
    return this.salesInvoicesService.convertFromOrder(
      companyId,
      userId,
      salesOrderId,
      dto.invoiceDate,
    );
  }

  @RequirePermissions('sales:view')
  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.salesInvoicesService.findAll(companyId, query);
  }

  @RequirePermissions('sales:view')
  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.salesInvoicesService.findOne(companyId, id);
  }

  @RequirePermissions('sales:cancel')
  @Patch(':id/cancel')
  cancel(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.salesInvoicesService.cancel(companyId, userId, id, dto);
  }
}
