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
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('sales-invoices')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('sales-invoices')
export class SalesInvoicesController {
  constructor(private readonly salesInvoicesService: SalesInvoicesService) {}

  @Post()
  issue(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSalesInvoiceDto,
  ) {
    return this.salesInvoicesService.issue(companyId, userId, dto);
  }

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

  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.salesInvoicesService.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.salesInvoicesService.findOne(companyId, id);
  }

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
