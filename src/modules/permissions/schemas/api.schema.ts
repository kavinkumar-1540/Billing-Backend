import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type ApiDocument = HydratedDocument<Api>;

@Schema({ timestamps: true, collection: 'permission_apis' })
export class Api {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'SubModule',
    required: true,
    index: true,
  })
  subModuleId!: Types.ObjectId;

  @Prop({ required: true })
  method!: string;

  /** Route patterns (e.g. '/sales-invoices/:id'), not literal URLs. */
  @Prop({ required: true, type: [String] })
  endpointPaths!: string[];

  @Prop({ default: true })
  isActive!: boolean;
}

export const ApiSchema = SchemaFactory.createForClass(Api);
