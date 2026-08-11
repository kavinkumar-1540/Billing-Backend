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
