import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import {
  Address,
  AddressSchema,
  DocumentLineItem,
  DocumentLineItemSchema,
  PartySnapshot,
  PartySnapshotSchema,
  TaxSummary,
  TaxSummarySchema,
} from '../../../common/schemas/shared.schemas';

export type SalesOrderDocument = HydratedDocument<SalesOrder>;

export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_INVOICED = 'PARTIALLY_INVOICED',
  INVOICED = 'INVOICED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Schema({ timestamps: true, collection: 'sales_orders' })
export class SalesOrder {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  orderNumber!: string;

  @Prop({ required: true })
  orderDate!: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Party', required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: PartySnapshotSchema, required: true })
  customerSnapshot!: PartySnapshot;

  @Prop({ type: AddressSchema })
  billingAddress?: Address;

  @Prop({ type: AddressSchema })
  shippingAddress?: Address;

  @Prop({ type: [DocumentLineItemSchema], default: [] })
  items!: DocumentLineItem[];

  @Prop({ type: TaxSummarySchema, required: true })
  taxSummary!: TaxSummary;

  @Prop()
  notes?: string;

  @Prop()
  terms?: string;

  @Prop()
  expectedDeliveryDate?: Date;

  @Prop({
    type: String,
    enum: SalesOrderStatus,
    default: SalesOrderStatus.DRAFT,
  })
  status!: SalesOrderStatus;

  @Prop({ type: [Types.ObjectId], ref: 'SalesInvoice', default: [] })
  invoiceIds!: Types.ObjectId[];
}

export const SalesOrderSchema = SchemaFactory.createForClass(SalesOrder);
SalesOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });
SalesOrderSchema.index({ companyId: 1, customerId: 1 });
SalesOrderSchema.index({ companyId: 1, status: 1 });
