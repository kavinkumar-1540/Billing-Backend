import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { Address, AddressSchema } from '../../../common/schemas/shared.schemas';

export type PartyDocument = HydratedDocument<Party>;

export enum PartyType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH',
}

@Schema({ timestamps: true, collection: 'parties' })
export class Party {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ type: String, enum: PartyType, required: true })
  partyType!: PartyType;

  @Prop({ required: true })
  name!: string;

  @Prop()
  businessName?: string;

  @Prop()
  contactPerson?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop({ type: AddressSchema })
  billingAddress?: Address;

  @Prop({ type: AddressSchema })
  shippingAddress?: Address;

  @Prop()
  gstin?: string;

  @Prop()
  pan?: string;

  @Prop()
  state?: string;

  @Prop()
  stateCode?: string;

  @Prop()
  placeOfSupply?: string;

  @Prop({ default: 0 })
  creditLimit!: number; // paise

  @Prop({ default: 0 })
  paymentTermsDays!: number;

  @Prop({ default: 0 })
  openingBalance!: number; // paise

  /** Cached running outstanding; updated atomically alongside invoices/bills/payments, never derived ad hoc at read time. */
  @Prop({ default: 0 })
  currentOutstanding!: number; // paise

  @Prop()
  notes?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const PartySchema = SchemaFactory.createForClass(Party);
PartySchema.index({ companyId: 1, name: 1 });
PartySchema.index({ companyId: 1, gstin: 1 });
PartySchema.index({ companyId: 1, partyType: 1 });
