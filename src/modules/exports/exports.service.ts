import { Injectable } from '@nestjs/common';
import { ReportsService } from '../reports/reports.service';
import { AuditService } from '../audit/audit.service';
import {
  DateRange,
  GstReportRow,
  PartyLedgerBalanceRow,
} from '../reports/reports.types';
import { buildWorkbook, type ExcelColumnDef } from './excel-builder.util';
import { AuditLogDocument } from '../audit/schemas/audit-log.schema';

const PARTY_LEDGER_COLUMNS: ExcelColumnDef<PartyLedgerBalanceRow>[] = [
  { header: 'Party', key: 'name', value: (r) => r.name },
  { header: 'GSTIN', key: 'gstin', value: (r) => r.gstin },
  { header: 'Phone', key: 'phone', value: (r) => r.phone },
  {
    header: 'Outstanding',
    key: 'currentOutstanding',
    isMoney: true,
    value: (r) => r.currentOutstanding,
  },
];

@Injectable()
export class ExportsService {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
  ) {}

  async salesReportExcel(companyId: string, range: DateRange): Promise<Buffer> {
    const rows = await this.reportsService.salesReport(companyId, range);
    return buildWorkbook(
      'Sales Report',
      [
        { header: 'Date', key: 'date', value: (r) => r.date },
        {
          header: 'Invoices',
          key: 'invoiceCount',
          value: (r) => r.invoiceCount,
        },
        {
          header: 'Taxable Amount',
          key: 'taxableAmount',
          isMoney: true,
          value: (r) => r.taxableAmount,
        },
        {
          header: 'Total Tax',
          key: 'totalTax',
          isMoney: true,
          value: (r) => r.totalTax,
        },
        {
          header: 'Grand Total',
          key: 'grandTotal',
          isMoney: true,
          value: (r) => r.grandTotal,
        },
      ],
      rows,
    );
  }

  async purchaseReportExcel(
    companyId: string,
    range: DateRange,
  ): Promise<Buffer> {
    const rows = await this.reportsService.purchaseReport(companyId, range);
    return buildWorkbook(
      'Purchase Report',
      [
        { header: 'Date', key: 'date', value: (r) => r.date },
        { header: 'Bills', key: 'billCount', value: (r) => r.billCount },
        {
          header: 'Taxable Amount',
          key: 'taxableAmount',
          isMoney: true,
          value: (r) => r.taxableAmount,
        },
        {
          header: 'Total Tax',
          key: 'totalTax',
          isMoney: true,
          value: (r) => r.totalTax,
        },
        {
          header: 'Grand Total',
          key: 'grandTotal',
          isMoney: true,
          value: (r) => r.grandTotal,
        },
      ],
      rows,
    );
  }

  async gstReportExcel(companyId: string, range: DateRange): Promise<Buffer> {
    const report = await this.reportsService.gstReport(companyId, range);
    const columns: ExcelColumnDef<GstReportRow>[] = [
      {
        header: 'GST Rate %',
        key: 'gstRatePercent',
        value: (r) => r.gstRatePercent,
      },
      {
        header: 'Taxable Amount',
        key: 'taxableAmount',
        isMoney: true,
        value: (r) => r.taxableAmount,
      },
      { header: 'CGST', key: 'cgst', isMoney: true, value: (r) => r.cgst },
      { header: 'SGST', key: 'sgst', isMoney: true, value: (r) => r.sgst },
      { header: 'IGST', key: 'igst', isMoney: true, value: (r) => r.igst },
      { header: 'Cess', key: 'cess', isMoney: true, value: (r) => r.cess },
      { header: 'Total', key: 'total', isMoney: true, value: (r) => r.total },
    ];
    return buildWorkbook('GST Report', columns, [
      ...report.sales,
      ...report.purchases,
    ]);
  }

  async inventoryReportExcel(companyId: string): Promise<Buffer> {
    const rows = await this.reportsService.inventoryReport(companyId);
    return buildWorkbook(
      'Inventory Report',
      [
        { header: 'Item', key: 'name', value: (r) => r.name },
        { header: 'SKU', key: 'sku', value: (r) => r.sku },
        { header: 'Unit', key: 'unit', value: (r) => r.unit },
        {
          header: 'Current Stock',
          key: 'currentStock',
          value: (r) => r.currentStock,
        },
        { header: 'Min Stock', key: 'minStock', value: (r) => r.minStock },
        {
          header: 'Purchase Price',
          key: 'purchasePrice',
          isMoney: true,
          value: (r) => r.purchasePrice,
        },
        {
          header: 'Selling Price',
          key: 'sellingPrice',
          isMoney: true,
          value: (r) => r.sellingPrice,
        },
        {
          header: 'Stock Value',
          key: 'stockValue',
          isMoney: true,
          value: (r) => r.stockValue,
        },
        { header: 'Low Stock', key: 'isLowStock', value: (r) => r.isLowStock },
      ],
      rows,
    );
  }

  async outstandingReportExcel(companyId: string): Promise<Buffer> {
    const rows = await this.reportsService.outstandingReport(companyId);
    return buildWorkbook(
      'Outstanding Report',
      [
        { header: 'Party', key: 'name', value: (r) => r.name },
        { header: 'Type', key: 'partyType', value: (r) => r.partyType },
        { header: 'GSTIN', key: 'gstin', value: (r) => r.gstin },
        {
          header: 'Outstanding',
          key: 'currentOutstanding',
          isMoney: true,
          value: (r) => r.currentOutstanding,
        },
      ],
      rows,
    );
  }

  async creditorsReportExcel(companyId: string): Promise<Buffer> {
    const rows = await this.reportsService.creditorsReport(companyId);
    return buildWorkbook('Creditors Report', PARTY_LEDGER_COLUMNS, rows);
  }

  async debtorsReportExcel(companyId: string): Promise<Buffer> {
    const rows = await this.reportsService.debtorsReport(companyId);
    return buildWorkbook('Debtors Report', PARTY_LEDGER_COLUMNS, rows);
  }

  async paymentReportExcel(
    companyId: string,
    range: DateRange,
  ): Promise<Buffer> {
    const rows = await this.reportsService.paymentReport(companyId, range);
    return buildWorkbook(
      'Payment Report',
      [
        { header: 'Date', key: 'date', value: (r) => r.date },
        { header: 'Type', key: 'paymentType', value: (r) => r.paymentType },
        { header: 'Method', key: 'method', value: (r) => r.method },
        { header: 'Count', key: 'count', value: (r) => r.count },
        {
          header: 'Total Amount',
          key: 'totalAmount',
          isMoney: true,
          value: (r) => r.totalAmount,
        },
      ],
      rows,
    );
  }

  async auditLogExcel(companyId: string, range: DateRange): Promise<Buffer> {
    const rows = await this.auditService.findForExport(companyId, range);
    return buildWorkbook<AuditLogDocument>(
      'Audit Log',
      [
        {
          header: 'Date',
          key: 'createdAt',
          value: (r) => r.get('createdAt') as Date,
        },
        { header: 'Action', key: 'action', value: (r) => r.action },
        { header: 'Entity', key: 'entity', value: (r) => r.entity },
        {
          header: 'Entity ID',
          key: 'entityId',
          value: (r) => String(r.entityId),
        },
        {
          header: 'User ID',
          key: 'userId',
          value: (r) => (r.userId ? String(r.userId) : undefined),
        },
        { header: 'IP Address', key: 'ipAddress', value: (r) => r.ipAddress },
      ],
      rows,
    );
  }
}
