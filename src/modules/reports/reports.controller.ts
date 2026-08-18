import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { DateRange } from './reports.types';

function toDateRange(query: DateRangeQueryDto): DateRange {
  return {
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  };
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@RequirePermissions('reports:view')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  sales(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.reportsService.salesReport(companyId, toDateRange(query));
  }

  @Get('purchases')
  purchases(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.reportsService.purchaseReport(companyId, toDateRange(query));
  }

  @Get('gst')
  gst(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.reportsService.gstReport(companyId, toDateRange(query));
  }

  @Get('inventory')
  inventory(@CurrentCompany('companyId') companyId: string) {
    return this.reportsService.inventoryReport(companyId);
  }

  @Get('outstanding')
  outstanding(@CurrentCompany('companyId') companyId: string) {
    return this.reportsService.outstandingReport(companyId);
  }

  @Get('creditors')
  creditors(@CurrentCompany('companyId') companyId: string) {
    return this.reportsService.creditorsReport(companyId);
  }

  @Get('debtors')
  debtors(@CurrentCompany('companyId') companyId: string) {
    return this.reportsService.debtorsReport(companyId);
  }

  @Get('payments')
  payments(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.reportsService.paymentReport(companyId, toDateRange(query));
  }

  @Get('monthly')
  monthly(@CurrentCompany('companyId') companyId: string) {
    return this.reportsService.monthlyReport(companyId);
  }

  @Get('gst-register')
  gstRegister(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.reportsService.gstRegisterReport(companyId, toDateRange(query));
  }

  @Get('stock-movement')
  stockMovement(@CurrentCompany('companyId') companyId: string) {
    return this.reportsService.stockMovementReport(companyId);
  }

  @Get('ledger')
  ledger(
    @CurrentCompany('companyId') companyId: string,
    @Query('partyId') partyId?: string,
  ) {
    if (!partyId) throw new BadRequestException('partyId is required');
    return this.reportsService.ledgerReport(companyId, partyId);
  }
}
