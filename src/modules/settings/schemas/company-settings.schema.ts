import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type CompanySettingsDocument = HydratedDocument<CompanySettings>;

@Schema({ _id: false })
export class InvoiceConfig {
  @Prop() logoUrl?: string;
  @Prop() header?: string;
  @Prop() footer?: string;
  @Prop() termsAndConditions?: string;
  @Prop() bankName?: string;
  @Prop() bankAccountNumber?: string;
  @Prop() bankIfsc?: string;
  @Prop() bankBranch?: string;
  @Prop() authorizedPersonName?: string;
  @Prop() signatureUrl?: string;
}
export const InvoiceConfigSchema = SchemaFactory.createForClass(InvoiceConfig);

@Schema({ timestamps: true, collection: 'company_settings' })
export class CompanySettings {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
  })
  companyId!: Types.ObjectId;

  @Prop({ type: InvoiceConfigSchema, default: {} })
  invoiceConfig!: InvoiceConfig;

  @Prop({ default: 30 })
  defaultPaymentTermsDays!: number;

  /** If false, sales/stock-adjustment operations are blocked from taking item stock negative. */
  @Prop({ default: false })
  allowNegativeStock!: boolean;

  /** If false, payments cannot be recorded for more than the outstanding balance. */
  @Prop({ default: false })
  allowOverpayment!: boolean;
}

export const CompanySettingsSchema =
  SchemaFactory.createForClass(CompanySettings);
