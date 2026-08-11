import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import {
  DocumentLineItem,
  DocumentLineItemSchema,
  PartySnapshot,
  PartySnapshotSchema,
  TaxSummary,
  TaxSummarySchema,
} from '../../../common/schemas/shared.schemas';

export type SalesInvoiceDocument = HydratedDocument<SalesInvoice>;

export enum SalesInvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
}

@Schema({ timestamps: true, collection: 'sales_invoices' })
export class SalesInvoice {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  invoiceNumber!: string;

  @Prop({ required: true })
  invoiceDate!: Date;

  @Prop()
  dueDate?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'SalesOrder' })
  salesOrderId?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Party', required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: PartySnapshotSchema, required: true })
  customerSnapshot!: PartySnapshot;

  @Prop({ required: true })
  placeOfSupply!: string;

  @Prop({ default: false })
  reverseCharge!: boolean;

  @Prop({ type: [DocumentLineItemSchema], default: [] })
  items!: DocumentLineItem[];

  @Prop({ type: TaxSummarySchema, required: true })
  taxSummary!: TaxSummary;

  @Prop({ default: 0 })
  amountPaid!: number; // paise

  @Prop({ default: 0 })
  balanceDue!: number; // paise

  @Prop({ type: String, enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @Prop({
    type: String,
    enum: SalesInvoiceStatus,
    default: SalesInvoiceStatus.DRAFT,
  })
  status!: SalesInvoiceStatus;

  @Prop()
  cancelledReason?: string;

  @Prop()
  cancelledAt?: Date;
}

export const SalesInvoiceSchema = SchemaFactory.createForClass(SalesInvoice);
SalesInvoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
SalesInvoiceSchema.index({ companyId: 1, invoiceDate: -1 });
SalesInvoiceSchema.index({ companyId: 1, customerId: 1 });
SalesInvoiceSchema.index({ companyId: 1, status: 1 });
