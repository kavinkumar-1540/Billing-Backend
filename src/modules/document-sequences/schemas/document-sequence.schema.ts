import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type DocumentSequenceDocument = HydratedDocument<DocumentSequence>;

export enum DocumentType {
  SALES_ORDER = 'SALES_ORDER',
  SALES_INVOICE = 'SALES_INVOICE',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  PURCHASE_BILL = 'PURCHASE_BILL',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  PAYMENT_PAYMENT = 'PAYMENT_PAYMENT',
  BILL_ADJUSTMENT = 'BILL_ADJUSTMENT',
}

@Schema({ timestamps: true, collection: 'document_sequences' })
export class DocumentSequence {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ type: String, enum: DocumentType, required: true })
  docType!: DocumentType;

  /** e.g. "2026" for FY2025-26 */
  @Prop({ required: true })
  financialYear!: string;

  @Prop({ required: true })
  prefix!: string;

  @Prop({ required: true, default: 0 })
  currentNumber!: number;

  @Prop({ required: true, default: 5 })
  numberLength!: number;
}

export const DocumentSequenceSchema =
  SchemaFactory.createForClass(DocumentSequence);
DocumentSequenceSchema.index(
  { companyId: 1, docType: 1, financialYear: 1 },
  { unique: true },
);
