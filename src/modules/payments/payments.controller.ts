import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentType } from './schemas/payment.schema';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  record(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.record(companyId, dto);
  }

  @Get('receipts')
  findReceipts(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.paymentsService.findAll(companyId, PaymentType.RECEIPT, query);
  }

  @Get('supplier-payments')
  findSupplierPayments(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.paymentsService.findAll(companyId, PaymentType.PAYMENT, query);
  }

  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOne(companyId, id);
  }

  @Get(':id/allocations')
  findAllocations(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findAllocations(companyId, id);
  }
}
