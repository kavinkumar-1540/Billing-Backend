import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from './schemas/company.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import {
  CompanyMember,
  CompanyMemberSchema,
} from '../company-members/schemas/company-member.schema';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: CompanyMember.name, schema: CompanyMemberSchema },
    ]),
    AuthModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [MongooseModule, CompaniesService],
})
export class CompaniesModule {}
