import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema';
import {
  CompanyMember,
  CompanyMemberSchema,
} from '../company-members/schemas/company-member.schema';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: CompanyMember.name, schema: CompanyMemberSchema },
    ]),
    AuthModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [MongooseModule, RolesService],
})
export class RolesModule {}
