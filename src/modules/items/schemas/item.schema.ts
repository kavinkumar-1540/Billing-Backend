import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type ItemDocument = HydratedDocument<Item>;

export enum ItemType {
  GOODS = 'GOODS',
  SERVICE = 'SERVICE',
}

@Schema({ timestamps: true, collection: 'items' })
export class Item {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  sku!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop()
  brand?: string;

  @Prop()
  hsnSac?: string;

  @Prop({ required: true })
  unit!: string;

  @Prop({ type: String, enum: ItemType, default: ItemType.GOODS })
  itemType!: ItemType;

  @Prop({ default: 0 })
  purchasePrice!: number; // paise

  @Prop({ default: 0 })
  sellingPrice!: number; // paise

  @Prop({ type: SchemaTypes.ObjectId, ref: 'TaxRate' })
  taxRateId?: Types.ObjectId;

  @Prop({ default: 0 })
  openingStock!: number;

  /** Cached quantity; only ever mutated atomically alongside a stock_movements insert. */
  @Prop({ default: 0 })
  currentStock!: number;

  @Prop({ default: 0 })
  minStock!: number;

  @Prop({ default: 0 })
  maxStock!: number;

  @Prop()
  barcode?: string;

  @Prop()
  batchNumber?: string;

  @Prop()
  expiryDate?: Date;

  @Prop({ default: true })
  isActive!: boolean;
}

export const ItemSchema = SchemaFactory.createForClass(Item);
ItemSchema.index({ companyId: 1, sku: 1 }, { unique: true });
ItemSchema.index({ companyId: 1, name: 1 });
ItemSchema.index({ companyId: 1, barcode: 1 });
