import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type SubModuleDocument = HydratedDocument<SubModule>;

@Schema({ timestamps: true, collection: 'permission_sub_modules' })
export class SubModule {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'PermissionModule',
    required: true,
    index: true,
  })
  moduleId!: Types.ObjectId;

  @Prop({ required: true })
  subModuleName!: string;

  /** Kept identical to the old static PERMISSIONS[].key strings, e.g. 'sales:create'. */
  @Prop({ required: true, unique: true })
  unique_key!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'SubModule', required: false })
  parentSubModuleId?: Types.ObjectId;
}

export const SubModuleSchema = SchemaFactory.createForClass(SubModule);
