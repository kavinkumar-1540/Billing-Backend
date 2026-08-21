import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DatabaseModule } from './config/database.module';

import { AuthModule } from './modules/auth/auth.module';
import { JwtAccessGuard } from './modules/auth/guards/jwt-access.guard';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CompanyMembersModule } from './modules/company-members/company-members.module';
import { PartiesModule } from './modules/parties/parties.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { ItemsModule } from './modules/items/items.module';
import { StockMovementsModule } from './modules/stock-movements/stock-movements.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { SalesInvoicesModule } from './modules/sales-invoices/sales-invoices.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { PurchaseBillsModule } from './modules/purchase-bills/purchase-bills.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PaymentAllocationsModule } from './modules/payment-allocations/payment-allocations.module';
import { CreditNotesModule } from './modules/credit-notes/credit-notes.module';
import { DebitNotesModule } from './modules/debit-notes/debit-notes.module';
import { DocumentSequencesModule } from './modules/document-sequences/document-sequences.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ExportsModule } from './modules/exports/exports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,

    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    CompaniesModule,
    CompanyMembersModule,
    PartiesModule,
    CategoriesModule,
    TaxesModule,
    ItemsModule,
    StockMovementsModule,
    SalesOrdersModule,
    SalesInvoicesModule,
    PurchaseOrdersModule,
    PurchaseBillsModule,
    PaymentsModule,
    PaymentAllocationsModule,
    CreditNotesModule,
    DebitNotesModule,
    DocumentSequencesModule,
    AuditModule,
    SettingsModule,
    DocumentsModule,
    ReportsModule,
    ExportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAccessGuard,
    },
  ],
})
export class AppModule {}
