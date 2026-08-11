import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SalesInvoice,
  SalesInvoiceSchema,
} from '../sales-invoices/schemas/sales-invoice.schema';
import {
  PurchaseBill,
  PurchaseBillSchema,
} from '../purchase-bills/schemas/purchase-bill.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import { Party, PartySchema } from '../parties/schemas/party.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import {
  CompanyMember,
  CompanyMemberSchema,
} from '../company-members/schemas/company-member.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesInvoice.name, schema: SalesInvoiceSchema },
      { name: PurchaseBill.name, schema: PurchaseBillSchema },
      { name: Item.name, schema: ItemSchema },
      { name: Party.name, schema: PartySchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: CompanyMember.name, schema: CompanyMemberSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
