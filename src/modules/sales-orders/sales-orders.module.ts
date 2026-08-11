import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesOrder, SalesOrderSchema } from './schemas/sales-order.schema';
import { Party, PartySchema } from '../parties/schemas/party.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { SalesOrdersService } from './sales-orders.service';
import { SalesOrdersController } from './sales-orders.controller';
import { AuthModule } from '../auth/auth.module';
import { TaxesModule } from '../taxes/taxes.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: Party.name, schema: PartySchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    AuthModule,
    TaxesModule,
    DocumentSequencesModule,
  ],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [MongooseModule, SalesOrdersService],
})
export class SalesOrdersModule {}
