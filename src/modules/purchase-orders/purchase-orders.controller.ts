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
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.create(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.purchaseOrdersService.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.purchaseOrdersService.findOne(companyId, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.purchaseOrdersService.cancel(companyId, id);
  }
}
