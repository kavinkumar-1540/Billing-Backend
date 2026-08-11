import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from './schemas/purchase-order.schema';
import { Party, PartySchema } from '../parties/schemas/party.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { AuthModule } from '../auth/auth.module';
import { TaxesModule } from '../taxes/taxes.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Party.name, schema: PartySchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    AuthModule,
    TaxesModule,
    DocumentSequencesModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [MongooseModule, PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
