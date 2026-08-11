import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { DateRangeQueryDto } from '../reports/dto/date-range-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { DateRange } from '../reports/reports.types';

function toDateRange(query: DateRangeQueryDto): DateRange {
  return {
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  };
}

function sendXlsx(res: Response, filename: string, buffer: Buffer): void {
  res.set({
    'Content-Type':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
}

@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@RequirePermissions('reports:export')
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('sales.xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async sales(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportsService.salesReportExcel(
      companyId,
      toDateRange(query),
    );
    sendXlsx(res, 'sales-report.xlsx', buffer);
  }

  @Get('purchases.xlsx')
  async purchases(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportsService.purchaseReportExcel(
      companyId,
      toDateRange(query),
    );
    sendXlsx(res, 'purchase-report.xlsx', buffer);
  }

  @Get('gst.xlsx')
  async gst(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportsService.gstReportExcel(
      companyId,
      toDateRange(query),
    );
    sendXlsx(res, 'gst-report.xlsx', buffer);
  }

  @Get('inventory.xlsx')
  async inventory(
    @CurrentCompany('companyId') companyId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportsService.inventoryReportExcel(companyId);
    sendXlsx(res, 'inventory-report.xlsx', buffer);
  }

  @Get('outstanding.xlsx')
  async outstanding(
    @CurrentCompany('companyId') companyId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportsService.outstandingReportExcel(companyId);
    sendXlsx(res, 'outstanding-report.xlsx', buffer);
  }

  @Get('payments.xlsx')
  async payments(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportsService.paymentReportExcel(
      companyId,
      toDateRange(query),
    );
    sendXlsx(res, 'payment-report.xlsx', buffer);
  }

  @Get('audit.xlsx')
  async audit(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: DateRangeQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportsService.auditLogExcel(
      companyId,
      toDateRange(query),
    );
    sendXlsx(res, 'audit-log.xlsx', buffer);
  }
}
