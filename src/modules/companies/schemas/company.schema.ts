import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Address, AddressSchema } from '../../../common/schemas/shared.schemas';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ timestamps: true, collection: 'companies' })
export class Company {
  @Prop({ required: true, unique: true, trim: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  legalName?: string;

  @Prop()
  logoUrl?: string;

  @Prop({ type: AddressSchema })
  address?: Address;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  website?: string;

  @Prop()
  gstin?: string;

  @Prop()
  pan?: string;

  @Prop()
  cin?: string;

  /** Month (1-12) the financial year starts, e.g. 4 for April (Indian FY default) */
  @Prop({ default: 4 })
  financialYearStartMonth!: number;

  @Prop({ default: 'INR' })
  currency!: string;

  @Prop()
  taxRegistrationType?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
