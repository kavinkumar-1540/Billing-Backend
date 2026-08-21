import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionModuleDocument = HydratedDocument<PermissionModule>;

/**
 * Named PermissionModule (not Module) to avoid colliding with NestJS's own
 * @Module decorator/type within this codebase.
 */
@Schema({ timestamps: true, collection: 'permission_modules' })
export class PermissionModule {
  @Prop({ required: true, unique: true })
  moduleName!: string;

  @Prop({ required: true })
  path!: string;

  @Prop({ required: true })
  icon!: string;

  @Prop({ required: true })
  order!: number;
}

export const PermissionModuleSchema =
  SchemaFactory.createForClass(PermissionModule);
