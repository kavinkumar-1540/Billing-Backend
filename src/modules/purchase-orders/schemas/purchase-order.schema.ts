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

export type PurchaseOrderDocument = HydratedDocument<PurchaseOrder>;

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Schema({ timestamps: true, collection: 'purchase_orders' })
export class PurchaseOrder {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  poNumber!: string;

  @Prop({ required: true })
  orderDate!: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Party', required: true })
  supplierId!: Types.ObjectId;

  @Prop({ type: PartySnapshotSchema, required: true })
  supplierSnapshot!: PartySnapshot;

  @Prop({ type: [DocumentLineItemSchema], default: [] })
  items!: DocumentLineItem[];

  @Prop({ type: TaxSummarySchema, required: true })
  taxSummary!: TaxSummary;

  @Prop()
  expectedDeliveryDate?: Date;

  @Prop()
  notes?: string;

  @Prop()
  terms?: string;

  @Prop({
    type: String,
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status!: PurchaseOrderStatus;

  @Prop({ type: [Types.ObjectId], ref: 'PurchaseBill', default: [] })
  billIds!: Types.ObjectId[];
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
PurchaseOrderSchema.index({ companyId: 1, poNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ companyId: 1, supplierId: 1 });
PurchaseOrderSchema.index({ companyId: 1, status: 1 });
