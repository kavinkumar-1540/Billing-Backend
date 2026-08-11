import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', default: null })
  parentCategoryId!: Types.ObjectId | null;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ companyId: 1, name: 1 });
