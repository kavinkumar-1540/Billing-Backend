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

export type DebitNoteDocument = HydratedDocument<DebitNote>;

export enum DebitNoteStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'debit_notes' })
export class DebitNote {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  noteNumber!: string;

  @Prop({ required: true })
  date!: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'PurchaseBill', required: true })
  originalBillId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Party', required: true })
  supplierId!: Types.ObjectId;

  @Prop({ type: PartySnapshotSchema, required: true })
  supplierSnapshot!: PartySnapshot;

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: [DocumentLineItemSchema], default: [] })
  items!: DocumentLineItem[];

  @Prop({ type: TaxSummarySchema, required: true })
  taxSummary!: TaxSummary;

  @Prop({ default: false })
  inventoryAdjusted!: boolean;

  @Prop({ type: String, enum: DebitNoteStatus, default: DebitNoteStatus.DRAFT })
  status!: DebitNoteStatus;
}

export const DebitNoteSchema = SchemaFactory.createForClass(DebitNote);
DebitNoteSchema.index({ companyId: 1, noteNumber: 1 }, { unique: true });
DebitNoteSchema.index({ companyId: 1, supplierId: 1 });
DebitNoteSchema.index({ companyId: 1, originalBillId: 1 });
