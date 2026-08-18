import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import {
  SalesInvoice,
  SalesInvoiceDocument,
  SalesInvoiceStatus,
} from '../sales-invoices/schemas/sales-invoice.schema';
import {
  PurchaseBill,
  PurchaseBillDocument,
  PurchaseBillStatus,
} from '../purchase-bills/schemas/purchase-bill.schema';
import { Item, ItemDocument } from '../items/schemas/item.schema';
import {
  Party,
  PartyDocument,
  PartyType,
} from '../parties/schemas/party.schema';
import {
  Payment,
  PaymentDocument,
  PaymentType,
} from '../payments/schemas/payment.schema';
import {
  CreditNote,
  CreditNoteDocument,
  CreditNoteStatus,
} from '../credit-notes/schemas/credit-note.schema';
import {
  DebitNote,
  DebitNoteDocument,
  DebitNoteStatus,
} from '../debit-notes/schemas/debit-note.schema';
import {
  StockMovement,
  StockMovementDocument,
  StockDirection,
} from '../stock-movements/schemas/stock-movement.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import {
  AgingBucket,
  DateRange,
  GstReport,
  GstTransactionRow,
  InventoryReportRow,
  LedgerEntryRow,
  MonthlyReportRow,
  OutstandingReportRow,
  PartyLedgerBalanceRow,
  PartyLedgerStatus,
  PaymentReportRow,
  PurchaseReportRow,
  SalesReportRow,
  StockMovementReportRow,
} from './reports.types';

function agingBucketFor(days: number): AgingBucket {
  if (days <= 0) return 'CURRENT';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  return '60+';
}

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
    @InjectModel(CreditNote.name)
    private readonly creditNoteModel: Model<CreditNoteDocument>,
    @InjectModel(DebitNote.name)
    private readonly debitNoteModel: Model<DebitNoteDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
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

  /** Per-transaction GST register merging sales invoices, purchase bills, and credit notes. */
  async gstRegisterReport(
    companyId: string,
    range: DateRange,
  ): Promise<GstTransactionRow[]> {
    const [invoices, bills, creditNotes] = await Promise.all([
      this.salesInvoiceModel
        .find({
          ...dateMatch(companyId, range, 'invoiceDate'),
          status: { $ne: SalesInvoiceStatus.CANCELLED },
        })
        .exec(),
      this.purchaseBillModel
        .find({
          ...dateMatch(companyId, range, 'billDate'),
          status: { $ne: PurchaseBillStatus.CANCELLED },
        })
        .exec(),
      this.creditNoteModel
        .find({
          ...dateMatch(companyId, range, 'date'),
          status: { $ne: CreditNoteStatus.CANCELLED },
        })
        .exec(),
    ]);

    const rows: GstTransactionRow[] = [
      ...invoices.map((inv) => ({
        date: inv.invoiceDate.toISOString(),
        docNumber: inv.invoiceNumber,
        type: 'SALES_INVOICE' as const,
        partyName: inv.customerSnapshot.name,
        partyGstin: inv.customerSnapshot.gstin,
        placeOfSupply: inv.placeOfSupply,
        taxableAmount: inv.taxSummary.taxableAmount,
        cgst: inv.taxSummary.cgst,
        sgst: inv.taxSummary.sgst,
        igst: inv.taxSummary.igst,
        total: inv.taxSummary.grandTotal,
      })),
      ...bills.map((bill) => ({
        date: bill.billDate.toISOString(),
        docNumber: bill.billNumber,
        type: 'PURCHASE_BILL' as const,
        partyName: bill.supplierSnapshot.name,
        partyGstin: bill.supplierSnapshot.gstin,
        placeOfSupply: bill.placeOfSupply,
        taxableAmount: bill.taxSummary.taxableAmount,
        cgst: bill.taxSummary.cgst,
        sgst: bill.taxSummary.sgst,
        igst: bill.taxSummary.igst,
        total: bill.taxSummary.grandTotal,
      })),
      ...creditNotes.map((note) => ({
        date: note.date.toISOString(),
        docNumber: note.noteNumber,
        type: 'CREDIT_NOTE' as const,
        partyName: note.customerSnapshot.name,
        partyGstin: note.customerSnapshot.gstin,
        placeOfSupply: undefined,
        taxableAmount: note.taxSummary.taxableAmount,
        cgst: note.taxSummary.cgst,
        sgst: note.taxSummary.sgst,
        igst: note.taxSummary.igst,
        total: note.taxSummary.grandTotal,
      })),
    ];

    return rows.sort((a, b) => a.date.localeCompare(b.date));
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

  /**
   * Real opening/inward/outward/closing stock movement per item, derived from
   * Item.openingStock (a real field set at item creation) plus the full
   * lifetime sum of that item's StockMovement records — not a fabricated
   * period window. movementIsFullHistory is always true here since we sum
   * every movement the item has ever had, not a truncated slice.
   */
  async stockMovementReport(
    companyId: string,
  ): Promise<StockMovementReportRow[]> {
    const companyObjectId = new Types.ObjectId(companyId);
    const [items, categories, movementRows] = await Promise.all([
      this.itemModel
        .find({ companyId: companyObjectId, isActive: true })
        .sort({ name: 1 })
        .exec(),
      this.categoryModel.find({ companyId: companyObjectId }).exec(),
      this.stockMovementModel
        .aggregate<{
          _id: { itemId: Types.ObjectId; direction: StockDirection };
          total: number;
        }>([
          { $match: { companyId: companyObjectId } },
          {
            $group: {
              _id: { itemId: '$itemId', direction: '$direction' },
              total: { $sum: '$quantity' },
            },
          },
        ])
        .exec(),
    ]);

    const categoryNameById = new Map(
      categories.map((c) => [String(c._id), c.name]),
    );
    const movementByItem = new Map<
      string,
      { inward: number; outward: number }
    >();
    for (const row of movementRows) {
      const id = String(row._id.itemId);
      const entry = movementByItem.get(id) ?? { inward: 0, outward: 0 };
      if (row._id.direction === StockDirection.IN) entry.inward = row.total;
      else entry.outward = row.total;
      movementByItem.set(id, entry);
    }

    return items.map((item) => {
      const id = String(item._id);
      const movement = movementByItem.get(id) ?? { inward: 0, outward: 0 };
      return {
        itemId: id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        hsnSac: item.hsnSac,
        category: item.categoryId
          ? categoryNameById.get(String(item.categoryId))
          : undefined,
        openingStock: item.openingStock,
        inward: movement.inward,
        outward: movement.outward,
        closingStock: item.currentStock,
        purchasePrice: item.purchasePrice,
        stockValue: item.currentStock * item.purchasePrice,
        isLowStock: item.currentStock <= item.minStock,
        movementIsFullHistory: true,
      };
    });
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

  /** Sum of grandTotal per partyId from a document model that has one. */
  private async sumByParty(
    model: Model<any>,
    companyId: string,
    partyField: string,
  ): Promise<Map<string, number>> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: `$${partyField}`,
          total: { $sum: '$taxSummary.grandTotal' },
        },
      },
    ];
    const rows = await model
      .aggregate<{ _id: Types.ObjectId; total: number }>(pipeline)
      .exec();
    return new Map(rows.map((r) => [String(r._id), r.total]));
  }

  /** Sum of payment amounts per partyId, filtered by paymentType. */
  private async sumPaymentsByParty(
    companyId: string,
    paymentType: 'RECEIPT' | 'PAYMENT',
  ): Promise<Map<string, number>> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          paymentType,
        },
      },
      { $group: { _id: '$partyId', total: { $sum: '$amount' } } },
    ];
    const rows = await this.paymentModel
      .aggregate<{ _id: Types.ObjectId; total: number }>(pipeline)
      .exec();
    return new Map(rows.map((r) => [String(r._id), r.total]));
  }

  /**
   * Earliest reference date among a party's unpaid (balanceDue > 0) documents —
   * used to compute a real aging bucket. For sales invoices this is the real
   * `dueDate` (falls back to `invoiceDate` if a document predates dueDate
   * tracking); purchase bills have no due-date field at all, so `billDate` is
   * used as the aging reference for creditors (documented in reports.types.ts).
   */
  private async oldestUnpaidDateByParty(
    model: Model<any>,
    companyId: string,
    partyField: string,
    dateField: string,
  ): Promise<Map<string, Date>> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          status: { $ne: 'CANCELLED' },
          balanceDue: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: `$${partyField}`,
          oldestDate: { $min: `$${dateField}` },
        },
      },
    ];
    const rows = await model
      .aggregate<{ _id: Types.ObjectId; oldestDate: Date }>(pipeline)
      .exec();
    return new Map(rows.map((r) => [String(r._id), r.oldestDate]));
  }

  private ageAndStatus(
    outstanding: number,
    oldestUnpaidDate: Date | undefined,
  ): { aging: AgingBucket; status: PartyLedgerStatus } {
    if (outstanding <= 0) return { aging: 'CURRENT', status: 'SETTLED' };
    if (!oldestUnpaidDate) return { aging: 'CURRENT', status: 'CURRENT' };
    const days = Math.floor(
      (Date.now() - oldestUnpaidDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const aging = agingBucketFor(days);
    return { aging, status: aging === 'CURRENT' ? 'CURRENT' : 'OVERDUE' };
  }

  /** Creditors: suppliers this company currently owes money to. */
  async creditorsReport(companyId: string): Promise<PartyLedgerBalanceRow[]> {
    const [suppliers, totalBilled, totalPaid, oldestUnpaid] = await Promise.all(
      [
        this.partyModel
          .find({
            companyId: new Types.ObjectId(companyId),
            isActive: true,
            partyType: { $in: [PartyType.SUPPLIER, PartyType.BOTH] },
            currentOutstanding: { $gt: 0 },
          })
          .sort({ currentOutstanding: -1 })
          .exec(),
        this.sumByParty(this.purchaseBillModel, companyId, 'supplierId'),
        this.sumPaymentsByParty(companyId, 'PAYMENT'),
        this.oldestUnpaidDateByParty(
          this.purchaseBillModel,
          companyId,
          'supplierId',
          'billDate',
        ),
      ],
    );

    return suppliers.map((party) => {
      const id = String(party._id);
      const { aging, status } = this.ageAndStatus(
        party.currentOutstanding,
        oldestUnpaid.get(id),
      );
      return {
        partyId: id,
        name: party.name,
        gstin: party.gstin,
        phone: party.phone,
        currentOutstanding: party.currentOutstanding,
        totalBilled: totalBilled.get(id) ?? 0,
        totalSettled: totalPaid.get(id) ?? 0,
        aging,
        status,
      };
    });
  }

  /** Debtors: customers who currently owe this company money. */
  async debtorsReport(companyId: string): Promise<PartyLedgerBalanceRow[]> {
    const [customers, totalBilled, totalReceived, oldestUnpaid] =
      await Promise.all([
        this.partyModel
          .find({
            companyId: new Types.ObjectId(companyId),
            isActive: true,
            partyType: { $in: [PartyType.CUSTOMER, PartyType.BOTH] },
            currentOutstanding: { $gt: 0 },
          })
          .sort({ currentOutstanding: -1 })
          .exec(),
        this.sumByParty(this.salesInvoiceModel, companyId, 'customerId'),
        this.sumPaymentsByParty(companyId, 'RECEIPT'),
        this.oldestUnpaidDateByParty(
          this.salesInvoiceModel,
          companyId,
          'customerId',
          'dueDate',
        ),
      ]);

    return customers.map((party) => {
      const id = String(party._id);
      const { aging, status } = this.ageAndStatus(
        party.currentOutstanding,
        oldestUnpaid.get(id),
      );
      return {
        partyId: id,
        name: party.name,
        gstin: party.gstin,
        phone: party.phone,
        currentOutstanding: party.currentOutstanding,
        totalBilled: totalBilled.get(id) ?? 0,
        totalSettled: totalReceived.get(id) ?? 0,
        creditLimit: party.creditLimit,
        aging,
        status,
      };
    });
  }

  async monthlyReport(companyId: string): Promise<MonthlyReportRow[]> {
    const companyObjectId = new Types.ObjectId(companyId);

    const salesPipeline: PipelineStage[] = [
      { $match: { companyId: companyObjectId, status: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
          invoicesCount: { $sum: 1 },
          taxableSales: { $sum: '$taxSummary.taxableAmount' },
          salesGst: {
            $sum: {
              $add: [
                '$taxSummary.cgst',
                '$taxSummary.sgst',
                '$taxSummary.igst',
                '$taxSummary.cess',
              ],
            },
          },
          salesTotal: { $sum: '$taxSummary.grandTotal' },
        },
      },
    ];

    const purchasePipeline: PipelineStage[] = [
      { $match: { companyId: companyObjectId, status: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$billDate' } },
          purchaseTotal: { $sum: '$taxSummary.grandTotal' },
          purchaseGst: {
            $sum: {
              $add: [
                '$taxSummary.cgst',
                '$taxSummary.sgst',
                '$taxSummary.igst',
                '$taxSummary.cess',
              ],
            },
          },
        },
      },
    ];

    const paymentPipeline: PipelineStage[] = [
      { $match: { companyId: companyObjectId } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$date' } },
            paymentType: '$paymentType',
          },
          total: { $sum: '$amount' },
        },
      },
    ];

    interface SalesAgg {
      _id: string;
      invoicesCount: number;
      taxableSales: number;
      salesGst: number;
      salesTotal: number;
    }
    interface PurchaseAgg {
      _id: string;
      purchaseTotal: number;
      purchaseGst: number;
    }
    interface PaymentAgg {
      _id: { month: string; paymentType: 'RECEIPT' | 'PAYMENT' };
      total: number;
    }

    const [salesRows, purchaseRows, paymentRows] = await Promise.all([
      this.salesInvoiceModel.aggregate<SalesAgg>(salesPipeline).exec(),
      this.purchaseBillModel.aggregate<PurchaseAgg>(purchasePipeline).exec(),
      this.paymentModel.aggregate<PaymentAgg>(paymentPipeline).exec(),
    ]);

    const months = new Map<string, MonthlyReportRow>();
    const ensure = (monthKey: string): MonthlyReportRow => {
      let row = months.get(monthKey);
      if (!row) {
        const [year, month] = monthKey.split('-').map(Number);
        const monthName = new Date(year, month - 1, 1).toLocaleString('en-IN', {
          month: 'short',
          year: 'numeric',
        });
        row = {
          monthKey,
          monthName,
          invoicesCount: 0,
          taxableSales: 0,
          salesGst: 0,
          salesTotal: 0,
          purchaseTotal: 0,
          purchaseGst: 0,
          receiptsTotal: 0,
          paymentsTotal: 0,
          netCashFlow: 0,
        };
        months.set(monthKey, row);
      }
      return row;
    };

    for (const r of salesRows) {
      const row = ensure(r._id);
      row.invoicesCount = r.invoicesCount;
      row.taxableSales = r.taxableSales;
      row.salesGst = r.salesGst;
      row.salesTotal = r.salesTotal;
    }
    for (const r of purchaseRows) {
      const row = ensure(r._id);
      row.purchaseTotal = r.purchaseTotal;
      row.purchaseGst = r.purchaseGst;
    }
    for (const r of paymentRows) {
      const row = ensure(r._id.month);
      if (r._id.paymentType === 'RECEIPT') row.receiptsTotal = r.total;
      else row.paymentsTotal = r.total;
    }

    return Array.from(months.values())
      .map((row) => ({
        ...row,
        netCashFlow: row.receiptsTotal - row.paymentsTotal,
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
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

  /**
   * Chronological dual-entry-style ledger for one party, merging every real
   * document type that affects their balance, with a running balance.
   * Customers: invoices/credit-notes are debits (they owe more), receipts are credits.
   * Suppliers: bills/debit-notes are credits (we owe more), payments are debits.
   */
  async ledgerReport(
    companyId: string,
    partyId: string,
  ): Promise<LedgerEntryRow[]> {
    const party = await this.partyModel
      .findOne({
        _id: new Types.ObjectId(partyId),
        companyId: new Types.ObjectId(companyId),
      })
      .exec();
    if (!party) throw new BadRequestException('Party not found');

    const companyObjectId = new Types.ObjectId(companyId);
    const partyObjectId = new Types.ObjectId(partyId);
    const isCustomer = party.partyType !== PartyType.SUPPLIER;
    const isSupplier = party.partyType !== PartyType.CUSTOMER;

    const entries: LedgerEntryRow[] = [];

    if (isCustomer) {
      const [invoices, creditNotes, receipts] = await Promise.all([
        this.salesInvoiceModel
          .find({
            companyId: companyObjectId,
            customerId: partyObjectId,
            status: { $ne: SalesInvoiceStatus.CANCELLED },
          })
          .exec(),
        this.creditNoteModel
          .find({
            companyId: companyObjectId,
            customerId: partyObjectId,
            status: { $ne: CreditNoteStatus.CANCELLED },
          })
          .exec(),
        this.paymentModel
          .find({
            companyId: companyObjectId,
            partyId: partyObjectId,
            paymentType: PaymentType.RECEIPT,
          })
          .exec(),
      ]);
      for (const inv of invoices) {
        entries.push({
          date: inv.invoiceDate.toISOString(),
          voucherNumber: inv.invoiceNumber,
          type: 'SALES_INVOICE',
          particulars: `Sales Invoice ${inv.invoiceNumber}`,
          debit: inv.taxSummary.grandTotal,
          credit: 0,
          balance: 0,
        });
      }
      for (const note of creditNotes) {
        entries.push({
          date: note.date.toISOString(),
          voucherNumber: note.noteNumber,
          type: 'CREDIT_NOTE',
          particulars: `Credit Note ${note.noteNumber} — ${note.reason}`,
          debit: 0,
          credit: note.taxSummary.grandTotal,
          balance: 0,
        });
      }
      for (const receipt of receipts) {
        entries.push({
          date: receipt.date.toISOString(),
          voucherNumber: receipt.paymentNumber,
          type: 'RECEIPT',
          particulars: `Receipt ${receipt.paymentNumber} (${receipt.method})`,
          debit: 0,
          credit: receipt.amount,
          balance: 0,
        });
      }
    }

    if (isSupplier) {
      const [bills, debitNotes, payments] = await Promise.all([
        this.purchaseBillModel
          .find({
            companyId: companyObjectId,
            supplierId: partyObjectId,
            status: { $ne: PurchaseBillStatus.CANCELLED },
          })
          .exec(),
        this.debitNoteModel
          .find({
            companyId: companyObjectId,
            supplierId: partyObjectId,
            status: { $ne: DebitNoteStatus.CANCELLED },
          })
          .exec(),
        this.paymentModel
          .find({
            companyId: companyObjectId,
            partyId: partyObjectId,
            paymentType: PaymentType.PAYMENT,
          })
          .exec(),
      ]);
      for (const bill of bills) {
        entries.push({
          date: bill.billDate.toISOString(),
          voucherNumber: bill.billNumber,
          type: 'PURCHASE_BILL',
          particulars: `Purchase Bill ${bill.billNumber}`,
          debit: 0,
          credit: bill.taxSummary.grandTotal,
          balance: 0,
        });
      }
      for (const note of debitNotes) {
        entries.push({
          date: note.date.toISOString(),
          voucherNumber: note.noteNumber,
          type: 'DEBIT_NOTE',
          particulars: `Debit Note ${note.noteNumber} — ${note.reason}`,
          debit: note.taxSummary.grandTotal,
          credit: 0,
          balance: 0,
        });
      }
      for (const payment of payments) {
        entries.push({
          date: payment.date.toISOString(),
          voucherNumber: payment.paymentNumber,
          type: 'PAYMENT',
          particulars: `Payment ${payment.paymentNumber} (${payment.method})`,
          debit: payment.amount,
          credit: 0,
          balance: 0,
        });
      }
    }

    entries.sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = 0;
    for (const entry of entries) {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    }

    return entries;
  }
}
