import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

/** Roles are global, shared across every company (not per-company). */
@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  @Prop({ required: true })
  name!: string;

  /** Stable slug identifying this role; immutable after creation. */
  @Prop({ required: true, unique: true })
  roleKey!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ default: false })
  isSystemDefault!: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
