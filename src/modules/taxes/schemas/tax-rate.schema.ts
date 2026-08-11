import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type TaxRateDocument = HydratedDocument<TaxRate>;

@Schema({ timestamps: true, collection: 'tax_rates' })
export class TaxRate {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  /** e.g. "GST 18%" */
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  ratePercent!: number;

  @Prop({ default: 0 })
  cessPercent!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const TaxRateSchema = SchemaFactory.createForClass(TaxRate);
TaxRateSchema.index({ companyId: 1, ratePercent: 1 });
