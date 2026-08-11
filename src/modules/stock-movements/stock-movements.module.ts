import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StockMovement,
  StockMovementSchema,
} from './schemas/stock-movement.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import {
  CompanySettings,
  CompanySettingsSchema,
} from '../settings/schemas/company-settings.schema';
import { StockMovementsService } from './stock-movements.service';
import { StockMovementsController } from './stock-movements.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: Item.name, schema: ItemSchema },
      { name: CompanySettings.name, schema: CompanySettingsSchema },
    ]),
    AuthModule,
    AuditModule,
  ],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [MongooseModule, StockMovementsService],
})
export class StockMovementsModule {}
