import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentType {
  RECEIPT = 'RECEIPT', // from customer
  PAYMENT = 'PAYMENT', // to supplier
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
}

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  paymentNumber!: string;

  @Prop({ type: String, enum: PaymentType, required: true })
  paymentType!: PaymentType;

  @Prop({ required: true })
  date!: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Party', required: true })
  partyId!: Types.ObjectId;

  @Prop({ required: true })
  amount!: number; // paise

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method!: PaymentMethod;

  @Prop()
  referenceNumber?: string;

  @Prop()
  bank?: string;

  @Prop()
  notes?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ companyId: 1, paymentNumber: 1 }, { unique: true });
PaymentSchema.index({ companyId: 1, partyId: 1 });
PaymentSchema.index({ companyId: 1, date: -1 });
