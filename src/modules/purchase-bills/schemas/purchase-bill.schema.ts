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

export type PurchaseBillDocument = HydratedDocument<PurchaseBill>;

export enum PurchaseBillStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'purchase_bills' })
export class PurchaseBill {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  billNumber!: string;

  @Prop()
  supplierInvoiceNumber?: string;

  @Prop({ required: true })
  billDate!: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'PurchaseOrder' })
  purchaseOrderId?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Party', required: true })
  supplierId!: Types.ObjectId;

  @Prop({ type: PartySnapshotSchema, required: true })
  supplierSnapshot!: PartySnapshot;

  @Prop({ required: true })
  placeOfSupply!: string;

  @Prop({ type: [DocumentLineItemSchema], default: [] })
  items!: DocumentLineItem[];

  @Prop({ type: TaxSummarySchema, required: true })
  taxSummary!: TaxSummary;

  @Prop({ default: 0 })
  amountPaid!: number; // paise

  @Prop({ default: 0 })
  balanceDue!: number; // paise

  @Prop({
    type: String,
    enum: PurchaseBillStatus,
    default: PurchaseBillStatus.DRAFT,
  })
  status!: PurchaseBillStatus;

  @Prop()
  cancelledReason?: string;

  @Prop()
  cancelledAt?: Date;
}

export const PurchaseBillSchema = SchemaFactory.createForClass(PurchaseBill);
PurchaseBillSchema.index({ companyId: 1, billNumber: 1 }, { unique: true });
PurchaseBillSchema.index({ companyId: 1, billDate: -1 });
PurchaseBillSchema.index({ companyId: 1, supplierId: 1 });
PurchaseBillSchema.index({ companyId: 1, status: 1 });
