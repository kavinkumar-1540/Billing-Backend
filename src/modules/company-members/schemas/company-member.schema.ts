import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';

export type CompanyMemberDocument = HydratedDocument<CompanyMember>;

@Schema({ timestamps: true, collection: 'company_members' })
export class CompanyMember {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Company', required: true })
  companyId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Role', required: true })
  roleId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;
}

export const CompanyMemberSchema = SchemaFactory.createForClass(CompanyMember);
CompanyMemberSchema.index({ companyId: 1, userId: 1 }, { unique: true });
CompanyMemberSchema.index({ userId: 1 });
