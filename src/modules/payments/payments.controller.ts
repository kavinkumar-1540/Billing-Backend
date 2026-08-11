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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @RequirePermissions('payments:create')
  @Post()
  record(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.record(companyId, dto);
  }

  @RequirePermissions('payments:view')
  @Get('receipts')
  findReceipts(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.paymentsService.findAll(companyId, PaymentType.RECEIPT, query);
  }

  @RequirePermissions('payments:view')
  @Get('supplier-payments')
  findSupplierPayments(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.paymentsService.findAll(companyId, PaymentType.PAYMENT, query);
  }

  @RequirePermissions('payments:view')
  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOne(companyId, id);
  }

  @RequirePermissions('payments:view')
  @Get(':id/allocations')
  findAllocations(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findAllocations(companyId, id);
  }
}
