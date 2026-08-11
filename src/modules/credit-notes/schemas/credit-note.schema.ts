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

export type CreditNoteDocument = HydratedDocument<CreditNote>;

export enum CreditNoteStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'credit_notes' })
export class CreditNote {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  noteNumber!: string;

  @Prop({ required: true })
  date!: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'SalesInvoice', required: true })
  originalInvoiceId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Party', required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: PartySnapshotSchema, required: true })
  customerSnapshot!: PartySnapshot;

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: [DocumentLineItemSchema], default: [] })
  items!: DocumentLineItem[];

  @Prop({ type: TaxSummarySchema, required: true })
  taxSummary!: TaxSummary;

  @Prop({ default: false })
  inventoryAdjusted!: boolean;

  @Prop({
    type: String,
    enum: CreditNoteStatus,
    default: CreditNoteStatus.DRAFT,
  })
  status!: CreditNoteStatus;
}

export const CreditNoteSchema = SchemaFactory.createForClass(CreditNote);
CreditNoteSchema.index({ companyId: 1, noteNumber: 1 }, { unique: true });
CreditNoteSchema.index({ companyId: 1, customerId: 1 });
CreditNoteSchema.index({ companyId: 1, originalInvoiceId: 1 });
