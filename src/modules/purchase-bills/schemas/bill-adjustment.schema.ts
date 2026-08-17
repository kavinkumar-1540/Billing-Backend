import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type BillAdjustmentDocument = HydratedDocument<BillAdjustment>;

export enum BillAdjustmentType {
  WRITE_OFF = 'WRITE_OFF',
  DISCOUNT = 'DISCOUNT',
  CORRECTION = 'CORRECTION',
}

/**
 * A financial-only correction against a confirmed purchase bill's balance —
 * e.g. a supplier-granted discount, a small write-off, or a balance
 * correction. Reduces the bill's balanceDue and the supplier's payable
 * outstanding without touching stock or amountPaid, since no cash moves and
 * no goods are returned (that's what debit notes are for).
 */
@Schema({ timestamps: true, collection: 'bill_adjustments' })
export class BillAdjustment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'PurchaseBill', required: true })
  purchaseBillId!: Types.ObjectId;

  @Prop({ required: true })
  adjustmentNumber!: string;

  @Prop({ required: true })
  date!: Date;

  @Prop({ type: String, enum: BillAdjustmentType, required: true })
  adjustmentType!: BillAdjustmentType;

  @Prop({ required: true })
  amount!: number; // paise, always positive; reduces balanceDue

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const BillAdjustmentSchema =
  SchemaFactory.createForClass(BillAdjustment);
BillAdjustmentSchema.index(
  { companyId: 1, adjustmentNumber: 1 },
  { unique: true },
);
BillAdjustmentSchema.index({ companyId: 1, purchaseBillId: 1 });
