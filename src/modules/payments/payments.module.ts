import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  PaymentAllocation,
  PaymentAllocationSchema,
} from '../payment-allocations/schemas/payment-allocation.schema';
import { Party, PartySchema } from '../parties/schemas/party.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import {
  CompanySettings,
  CompanySettingsSchema,
} from '../settings/schemas/company-settings.schema';
import {
  SalesInvoice,
  SalesInvoiceSchema,
} from '../sales-invoices/schemas/sales-invoice.schema';
import {
  PurchaseBill,
  PurchaseBillSchema,
} from '../purchase-bills/schemas/purchase-bill.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentAllocation.name, schema: PaymentAllocationSchema },
      { name: Party.name, schema: PartySchema },
      { name: Company.name, schema: CompanySchema },
      { name: CompanySettings.name, schema: CompanySettingsSchema },
      { name: SalesInvoice.name, schema: SalesInvoiceSchema },
      { name: PurchaseBill.name, schema: PurchaseBillSchema },
    ]),
    AuthModule,
    DocumentSequencesModule,
    AuditModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [MongooseModule, PaymentsService],
})
export class PaymentsModule {}
