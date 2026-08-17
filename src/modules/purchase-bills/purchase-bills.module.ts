import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PurchaseBill,
  PurchaseBillSchema,
} from './schemas/purchase-bill.schema';
import {
  BillAdjustment,
  BillAdjustmentSchema,
} from './schemas/bill-adjustment.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import { Party, PartySchema } from '../parties/schemas/party.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import {
  StockMovement,
  StockMovementSchema,
} from '../stock-movements/schemas/stock-movement.schema';
import { PurchaseBillsService } from './purchase-bills.service';
import { PurchaseBillsController } from './purchase-bills.controller';
import { BillAdjustmentsService } from './bill-adjustments.service';
import { BillAdjustmentsController } from './bill-adjustments.controller';
import { AuthModule } from '../auth/auth.module';
import { TaxesModule } from '../taxes/taxes.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseBill.name, schema: PurchaseBillSchema },
      { name: BillAdjustment.name, schema: BillAdjustmentSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Party.name, schema: PartySchema },
      { name: Company.name, schema: CompanySchema },
      { name: Item.name, schema: ItemSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    AuthModule,
    TaxesModule,
    DocumentSequencesModule,
    AuditModule,
  ],
  controllers: [PurchaseBillsController, BillAdjustmentsController],
  providers: [PurchaseBillsService, BillAdjustmentsService],
  exports: [MongooseModule, PurchaseBillsService, BillAdjustmentsService],
})
export class PurchaseBillsModule {}
