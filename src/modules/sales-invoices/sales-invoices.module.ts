import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SalesInvoice,
  SalesInvoiceSchema,
} from './schemas/sales-invoice.schema';
import {
  SalesOrder,
  SalesOrderSchema,
} from '../sales-orders/schemas/sales-order.schema';
import { Party, PartySchema } from '../parties/schemas/party.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import {
  CompanySettings,
  CompanySettingsSchema,
} from '../settings/schemas/company-settings.schema';
import {
  StockMovement,
  StockMovementSchema,
} from '../stock-movements/schemas/stock-movement.schema';
import { SalesInvoicesService } from './sales-invoices.service';
import { SalesInvoicesController } from './sales-invoices.controller';
import { AuthModule } from '../auth/auth.module';
import { TaxesModule } from '../taxes/taxes.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesInvoice.name, schema: SalesInvoiceSchema },
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: Party.name, schema: PartySchema },
      { name: Company.name, schema: CompanySchema },
      { name: Item.name, schema: ItemSchema },
      { name: CompanySettings.name, schema: CompanySettingsSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    AuthModule,
    TaxesModule,
    DocumentSequencesModule,
    AuditModule,
  ],
  controllers: [SalesInvoicesController],
  providers: [SalesInvoicesService],
  exports: [MongooseModule, SalesInvoicesService],
})
export class SalesInvoicesModule {}
