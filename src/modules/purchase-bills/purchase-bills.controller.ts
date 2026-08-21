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
import { PurchaseBillsService } from './purchase-bills.service';
import { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto';
import { CancelPurchaseBillDto } from './dto/cancel-purchase-bill.dto';
import { ConvertPurchaseOrderDto } from './dto/convert-purchase-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('purchase-bills')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('purchase-bills')
export class PurchaseBillsController {
  constructor(private readonly purchaseBillsService: PurchaseBillsService) {}

  @Post()
  confirm(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePurchaseBillDto,
  ) {
    return this.purchaseBillsService.confirm(companyId, userId, dto);
  }

  @Post('from-order/:purchaseOrderId')
  convertFromOrder(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Body() dto: ConvertPurchaseOrderDto,
  ) {
    return this.purchaseBillsService.convertFromOrder(
      companyId,
      userId,
      purchaseOrderId,
      dto.billDate,
    );
  }

  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.purchaseBillsService.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.purchaseBillsService.findOne(companyId, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CancelPurchaseBillDto,
  ) {
    return this.purchaseBillsService.cancel(companyId, userId, id, dto);
  }
}
