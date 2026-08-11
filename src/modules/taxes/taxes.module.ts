import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaxRate, TaxRateSchema } from './schemas/tax-rate.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';
import { TaxCalculationService } from './tax-calculation.service';
import { DocumentLineBuilderService } from './document-line-builder.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaxRate.name, schema: TaxRateSchema },
      { name: Item.name, schema: ItemSchema },
    ]),
    AuthModule,
  ],
  controllers: [TaxesController],
  providers: [TaxesService, TaxCalculationService, DocumentLineBuilderService],
  exports: [
    MongooseModule,
    TaxesService,
    TaxCalculationService,
    DocumentLineBuilderService,
  ],
})
export class TaxesModule {}
