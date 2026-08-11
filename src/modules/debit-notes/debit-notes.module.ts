import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DebitNote, DebitNoteSchema } from './schemas/debit-note.schema';
import {
  PurchaseBill,
  PurchaseBillSchema,
} from '../purchase-bills/schemas/purchase-bill.schema';
import { Party, PartySchema } from '../parties/schemas/party.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import {
  StockMovement,
  StockMovementSchema,
} from '../stock-movements/schemas/stock-movement.schema';
import { DebitNotesService } from './debit-notes.service';
import { DebitNotesController } from './debit-notes.controller';
import { AuthModule } from '../auth/auth.module';
import { TaxesModule } from '../taxes/taxes.module';
import { DocumentSequencesModule } from '../document-sequences/document-sequences.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DebitNote.name, schema: DebitNoteSchema },
      { name: PurchaseBill.name, schema: PurchaseBillSchema },
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
  controllers: [DebitNotesController],
  providers: [DebitNotesService],
  exports: [MongooseModule, DebitNotesService],
})
export class DebitNotesModule {}
