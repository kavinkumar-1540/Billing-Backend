import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import {
  SalesInvoice,
  SalesInvoiceDocument,
} from '../sales-invoices/schemas/sales-invoice.schema';
import {
  PurchaseBill,
  PurchaseBillDocument,
} from '../purchase-bills/schemas/purchase-bill.schema';
import { Item, ItemDocument } from '../items/schemas/item.schema';
import { Party, PartyDocument } from '../parties/schemas/party.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import {
  DateRange,
  GstReport,
  InventoryReportRow,
  OutstandingReportRow,
  PaymentReportRow,
  PurchaseReportRow,
  SalesReportRow,
} from './reports.types';

function dateMatch(companyId: string, range: DateRange, dateField: string) {
  const match: Record<string, unknown> = {
    companyId: new Types.ObjectId(companyId),
  };
  if (range.from || range.to) {
    const dateFilter: Record<string, Date> = {};
    if (range.from) dateFilter.$gte = range.from;
    if (range.to) dateFilter.$lte = range.to;
    match[dateField] = dateFilter;
  }
  return match;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(SalesInvoice.name)
    private readonly salesInvoiceModel: Model<SalesInvoiceDocument>,
    @InjectModel(PurchaseBill.name)
    private readonly purchaseBillModel: Model<PurchaseBillDocument>,
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
    @InjectModel(Party.name) private readonly partyModel: Model<PartyDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async salesReport(
    companyId: string,
    range: DateRange,
  ): Promise<SalesReportRow[]> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...dateMatch(companyId, range, 'invoiceDate'),
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' } },
          invoiceCount: { $sum: 1 },
          taxableAmount: { $sum: '$taxSummary.taxableAmount' },
          totalTax: {
            $sum: {
              $add: [
                '$taxSummary.cgst',
                '$taxSummary.sgst',
                '$taxSummary.igst',
                '$taxSummary.cess',
              ],
            },
          },
          grandTotal: { $sum: '$taxSummary.grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const rows = await this.salesInvoiceModel
      .aggregate<{
        _id: string;
        invoiceCount: number;
        taxableAmount: number;
        totalTax: number;
        grandTotal: number;
      }>(pipeline)
      .exec();
    return rows.map((r) => ({
      date: r._id,
      invoiceCount: r.invoiceCount,
      taxableAmount: r.taxableAmount,
      totalTax: r.totalTax,
      grandTotal: r.grandTotal,
    }));
  }

  async purchaseReport(
    companyId: string,
    range: DateRange,
  ): Promise<PurchaseReportRow[]> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...dateMatch(companyId, range, 'billDate'),
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$billDate' } },
          billCount: { $sum: 1 },
          taxableAmount: { $sum: '$taxSummary.taxableAmount' },
          totalTax: {
            $sum: {
              $add: [
                '$taxSummary.cgst',
                '$taxSummary.sgst',
                '$taxSummary.igst',
                '$taxSummary.cess',
              ],
            },
          },
          grandTotal: { $sum: '$taxSummary.grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const rows = await this.purchaseBillModel
      .aggregate<{
        _id: string;
        billCount: number;
        taxableAmount: number;
        totalTax: number;
        grandTotal: number;
      }>(pipeline)
      .exec();
    return rows.map((r) => ({
      date: r._id,
      billCount: r.billCount,
      taxableAmount: r.taxableAmount,
      totalTax: r.totalTax,
      grandTotal: r.grandTotal,
    }));
  }

  async gstReport(companyId: string, range: DateRange): Promise<GstReport> {
    const byRateGroup = (): PipelineStage[] => [
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.gstRatePercent',
          taxableAmount: { $sum: '$items.taxableValue' },
          cgst: { $sum: '$items.cgst' },
          sgst: { $sum: '$items.sgst' },
          igst: { $sum: '$items.igst' },
          cess: { $sum: '$items.cess' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const salesPipeline: PipelineStage[] = [
      {
        $match: {
          ...dateMatch(companyId, range, 'invoiceDate'),
          status: { $ne: 'CANCELLED' },
        },
      },
      ...byRateGroup(),
    ];
    const purchasePipeline: PipelineStage[] = [
      {
        $match: {
          ...dateMatch(companyId, range, 'billDate'),
          status: { $ne: 'CANCELLED' },
        },
      },
      ...byRateGroup(),
    ];

    interface GstRateAggRow {
      _id: number;
      taxableAmount: number;
      cgst: number;
      sgst: number;
      igst: number;
      cess: number;
    }

    const [salesRows, purchaseRows] = await Promise.all([
      this.salesInvoiceModel.aggregate<GstRateAggRow>(salesPipeline).exec(),
      this.purchaseBillModel.aggregate<GstRateAggRow>(purchasePipeline).exec(),
    ]);

    const project = (rows: GstRateAggRow[]) =>
      rows.map((r) => ({
        gstRatePercent: r._id,
        taxableAmount: r.taxableAmount,
        cgst: r.cgst,
        sgst: r.sgst,
        igst: r.igst,
        cess: r.cess,
        total: r.taxableAmount + r.cgst + r.sgst + r.igst + r.cess,
      }));

    return { sales: project(salesRows), purchases: project(purchaseRows) };
  }

  async inventoryReport(companyId: string): Promise<InventoryReportRow[]> {
    const items = await this.itemModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .sort({ name: 1 })
      .exec();

    return items.map((item) => ({
      itemId: String(item._id),
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      currentStock: item.currentStock,
      minStock: item.minStock,
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      stockValue: item.currentStock * item.purchasePrice,
      isLowStock: item.currentStock <= item.minStock,
    }));
  }

  async outstandingReport(companyId: string): Promise<OutstandingReportRow[]> {
    const parties = await this.partyModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isActive: true,
        currentOutstanding: { $ne: 0 },
      })
      .sort({ currentOutstanding: -1 })
      .exec();

    return parties.map((party) => ({
      partyId: String(party._id),
      name: party.name,
      partyType: party.partyType,
      gstin: party.gstin,
      currentOutstanding: party.currentOutstanding,
    }));
  }

  async paymentReport(
    companyId: string,
    range: DateRange,
  ): Promise<PaymentReportRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: dateMatch(companyId, range, 'date') },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            paymentType: '$paymentType',
            method: '$method',
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ];
    const rows = await this.paymentModel
      .aggregate<{
        _id: {
          date: string;
          paymentType: 'RECEIPT' | 'PAYMENT';
          method: string;
        };
        count: number;
        totalAmount: number;
      }>(pipeline)
      .exec();
    return rows.map((r) => ({
      date: r._id.date,
      paymentType: r._id.paymentType,
      method: r._id.method,
      count: r.count,
      totalAmount: r.totalAmount,
    }));
  }
}
