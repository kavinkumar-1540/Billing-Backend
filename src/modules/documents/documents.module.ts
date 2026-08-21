import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import {
  CompanySettings,
  CompanySettingsSchema,
} from '../settings/schemas/company-settings.schema';
import {
  SalesOrder,
  SalesOrderSchema,
} from '../sales-orders/schemas/sales-order.schema';
import {
  SalesInvoice,
  SalesInvoiceSchema,
} from '../sales-invoices/schemas/sales-invoice.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  PurchaseBill,
  PurchaseBillSchema,
} from '../purchase-bills/schemas/purchase-bill.schema';
import {
  CreditNote,
  CreditNoteSchema,
} from '../credit-notes/schemas/credit-note.schema';
import {
  DebitNote,
  DebitNoteSchema,
} from '../debit-notes/schemas/debit-note.schema';
import {
  CompanyMember,
  CompanyMemberSchema,
} from '../company-members/schemas/company-member.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { PermissionsModule } from '../permissions/permissions.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfRenderService } from './pdf-render.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: CompanySettings.name, schema: CompanySettingsSchema },
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: SalesInvoice.name, schema: SalesInvoiceSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: PurchaseBill.name, schema: PurchaseBillSchema },
      { name: CreditNote.name, schema: CreditNoteSchema },
      { name: DebitNote.name, schema: DebitNoteSchema },
      { name: CompanyMember.name, schema: CompanyMemberSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    PermissionsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfRenderService],
})
export class DocumentsModule {}
