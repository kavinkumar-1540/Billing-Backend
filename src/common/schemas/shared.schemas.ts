import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, SchemaTypes } from 'mongoose';

@Schema({ _id: false })
export class Address {
  @Prop() line1?: string;
  @Prop() line2?: string;
  @Prop() city?: string;
  @Prop() state?: string;
  @Prop() stateCode?: string;
  @Prop() country?: string;
  @Prop() pincode?: string;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

/** Frozen customer/supplier data captured at document-issue time; never re-hydrated from the live party record. */
@Schema({ _id: false })
export class PartySnapshot {
  @Prop({ required: true }) name!: string;
  @Prop() businessName?: string;
  @Prop() gstin?: string;
  @Prop() pan?: string;
  @Prop({ type: AddressSchema }) address?: Address;
  @Prop() state?: string;
  @Prop() stateCode?: string;
  @Prop() phone?: string;
  @Prop() email?: string;
}
export const PartySnapshotSchema = SchemaFactory.createForClass(PartySnapshot);

/** One line item on an order/invoice/bill/note, with a frozen snapshot of item data at the time. */
@Schema({ _id: false })
export class DocumentLineItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Item' }) itemId?: Types.ObjectId;
  @Prop({ required: true }) name!: string;
  @Prop() sku?: string;
  @Prop() hsnSac?: string;
  @Prop() unit?: string;
  @Prop({ required: true }) quantity!: number;
  @Prop({ required: true }) rate!: number; // paise, per unit
  @Prop({ default: 0 }) discountPercent?: number;
  @Prop({ default: 0 }) discountAmount!: number; // paise
  @Prop({ default: 0 }) gstRatePercent!: number;
  @Prop({ default: 0 }) cessRatePercent?: number;
  @Prop({ required: true }) taxableValue!: number; // paise
  @Prop({ default: 0 }) cgst!: number; // paise
  @Prop({ default: 0 }) sgst!: number; // paise
  @Prop({ default: 0 }) igst!: number; // paise
  @Prop({ default: 0 }) cess!: number; // paise
  @Prop({ required: true }) total!: number; // paise
}
export const DocumentLineItemSchema =
  SchemaFactory.createForClass(DocumentLineItem);

/** Document-level tax summary, embedded in every sales/purchase document. All values in paise. */
@Schema({ _id: false })
export class TaxSummary {
  @Prop({ required: true, default: 0 }) subtotal!: number;
  @Prop({ required: true, default: 0 }) totalDiscount!: number;
  @Prop({ required: true, default: 0 }) taxableAmount!: number;
  @Prop({ required: true, default: 0 }) cgst!: number;
  @Prop({ required: true, default: 0 }) sgst!: number;
  @Prop({ required: true, default: 0 }) igst!: number;
  @Prop({ required: true, default: 0 }) cess!: number;
  @Prop({ required: true, default: 0 }) roundOff!: number;
  @Prop({ required: true, default: 0 }) grandTotal!: number;
}
export const TaxSummarySchema = SchemaFactory.createForClass(TaxSummary);
