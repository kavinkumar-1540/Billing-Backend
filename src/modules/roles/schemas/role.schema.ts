import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  /** null for system-default roles shared across all companies */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', default: null })
  companyId!: Types.ObjectId | null;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ default: false })
  isSystemDefault!: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
RoleSchema.index({ companyId: 1, name: 1 }, { unique: true });
