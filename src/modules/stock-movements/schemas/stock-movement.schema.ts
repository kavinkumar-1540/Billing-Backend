import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type StockMovementDocument = HydratedDocument<StockMovement>;

export enum StockDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum StockMovementType {
  OPENING = 'OPENING',
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  SALE_RETURN = 'SALE_RETURN',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
}

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'stock_movements',
})
export class StockMovement {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Item', required: true })
  itemId!: Types.ObjectId;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ type: String, enum: StockDirection, required: true })
  direction!: StockDirection;

  @Prop({ type: String, enum: StockMovementType, required: true })
  movementType!: StockMovementType;

  @Prop()
  refDocType?: string;

  @Prop({ type: SchemaTypes.ObjectId })
  refDocId?: Types.ObjectId;

  @Prop()
  unitPrice?: number; // paise

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.index({ companyId: 1, itemId: 1 });
StockMovementSchema.index({ companyId: 1, createdAt: -1 });
StockMovementSchema.index({ companyId: 1, refDocType: 1, refDocId: 1 });
