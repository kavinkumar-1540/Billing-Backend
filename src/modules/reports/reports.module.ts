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
  CreditNote,
  CreditNoteSchema,
} from '../credit-notes/schemas/credit-note.schema';
import {
  DebitNote,
  DebitNoteSchema,
} from '../debit-notes/schemas/debit-note.schema';
import {
  StockMovement,
  StockMovementSchema,
} from '../stock-movements/schemas/stock-movement.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
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
      { name: CreditNote.name, schema: CreditNoteSchema },
      { name: DebitNote.name, schema: DebitNoteSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: Category.name, schema: CategorySchema },
      { name: CompanyMember.name, schema: CompanyMemberSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
