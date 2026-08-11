import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type PaymentAllocationDocument = HydratedDocument<PaymentAllocation>;

export enum AllocationRefType {
  SALES_INVOICE = 'SALES_INVOICE',
  PURCHASE_BILL = 'PURCHASE_BILL',
}

@Schema({ timestamps: true, collection: 'payment_allocations' })
export class PaymentAllocation {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Payment', required: true })
  paymentId!: Types.ObjectId;

  @Prop({ type: String, enum: AllocationRefType, required: true })
  refDocType!: AllocationRefType;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  refDocId!: Types.ObjectId;

  @Prop({ required: true })
  allocatedAmount!: number; // paise
}

export const PaymentAllocationSchema =
  SchemaFactory.createForClass(PaymentAllocation);
PaymentAllocationSchema.index({ companyId: 1, refDocId: 1 });
PaymentAllocationSchema.index({ companyId: 1, paymentId: 1 });
