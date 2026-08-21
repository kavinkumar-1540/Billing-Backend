import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

/** Role -> granted-permissions junction document; role_key is a string join to Role.roleKey. */
@Schema({ timestamps: true, collection: 'role_permissions' })
export class Permission {
  @Prop({ required: true, unique: true, index: true })
  role_key!: string;

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'PermissionModule', default: [] })
  moduleId!: Types.ObjectId[];

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'SubModule', default: [] })
  permissionId!: Types.ObjectId[];

  @Prop({ type: [SchemaTypes.ObjectId], ref: 'Api', default: [] })
  apiId!: Types.ObjectId[];
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
