export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SalesReportRow {
  date: string; // YYYY-MM-DD bucket
  invoiceCount: number;
  taxableAmount: number; // paise
  totalTax: number; // paise
  grandTotal: number; // paise
}

export interface PurchaseReportRow {
  date: string;
  billCount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
}

export interface GstReportRow {
  gstRatePercent: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
}

export interface GstReport {
  sales: GstReportRow[];
  purchases: GstReportRow[];
}

export interface InventoryReportRow {
  itemId: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  minStock: number;
  purchasePrice: number;
  sellingPrice: number;
  stockValue: number; // currentStock * purchasePrice, paise
  isLowStock: boolean;
}

export interface OutstandingReportRow {
  partyId: string;
  name: string;
  partyType: string;
  gstin?: string;
  currentOutstanding: number; // paise
}

export type AgingBucket = 'CURRENT' | '1-30' | '31-60' | '60+';
export type PartyLedgerStatus = 'CURRENT' | 'OVERDUE' | 'SETTLED';

export interface PartyLedgerBalanceRow {
  partyId: string;
  name: string;
  gstin?: string;
  phone?: string;
  currentOutstanding: number; // paise
  totalBilled: number; // paise — sum of grandTotal across their invoices/bills
  totalSettled: number; // paise — sum of payments made/received against them
  creditLimit?: number; // paise — debtors only, from Party.creditLimit
  aging: AgingBucket; // debtors: from real SalesInvoice.dueDate; creditors: from PurchaseBill.billDate (no due date field exists on bills)
  status: PartyLedgerStatus;
}

export interface MonthlyReportRow {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "Aug 2026"
  invoicesCount: number;
  taxableSales: number; // paise
  salesGst: number; // paise
  salesTotal: number; // paise
  purchaseTotal: number; // paise
  purchaseGst: number; // paise
  receiptsTotal: number; // paise
  paymentsTotal: number; // paise
  netCashFlow: number; // paise, receiptsTotal - paymentsTotal
}

export interface PaymentReportRow {
  date: string;
  paymentType: 'RECEIPT' | 'PAYMENT';
  method: string;
  count: number;
  totalAmount: number; // paise
}

export interface ReportSummary<T> {
  rows: T[];
  totals: Record<string, number>;
}

export type GstTransactionType =
  'SALES_INVOICE' | 'PURCHASE_BILL' | 'CREDIT_NOTE';

export interface GstTransactionRow {
  date: string; // ISO date
  docNumber: string;
  type: GstTransactionType;
  partyName: string;
  partyGstin?: string;
  placeOfSupply?: string;
  taxableAmount: number; // paise
  cgst: number;
  sgst: number;
  igst: number;
  total: number; // paise
}

export interface StockMovementReportRow {
  itemId: string;
  name: string;
  sku: string;
  unit: string;
  hsnSac?: string;
  category?: string;
  openingStock: number;
  inward: number;
  outward: number;
  closingStock: number;
  purchasePrice: number; // paise
  stockValue: number; // paise
  isLowStock: boolean;
  /** Whether opening/inward/outward reflect the full lifetime of stock-movement records for this item (true), or are approximate because movement history didn't fully cover the item's existence (false) — surfaced so the UI never silently implies precision it doesn't have. */
  movementIsFullHistory: boolean;
}

export type LedgerEntryType =
  | 'SALES_INVOICE'
  | 'PURCHASE_BILL'
  | 'RECEIPT'
  | 'PAYMENT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE';

export interface LedgerEntryRow {
  date: string; // ISO date
  voucherNumber: string;
  type: LedgerEntryType;
  particulars: string;
  debit: number; // paise
  credit: number; // paise
  balance: number; // paise, running balance after this entry
}
