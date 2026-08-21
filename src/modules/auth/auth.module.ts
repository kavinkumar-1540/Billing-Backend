import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import {
  CompanyMember,
  CompanyMemberSchema,
} from '../company-members/schemas/company-member.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { CompanyScopeGuard } from './guards/company-scope.guard';
import { ApiPermissionGuard } from './guards/api-permission.guard';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    forwardRef(() => PermissionsModule),
    MongooseModule.forFeature([
      { name: CompanyMember.name, schema: CompanyMemberSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    CompanyScopeGuard,
    ApiPermissionGuard,
  ],
  exports: [
    CompanyScopeGuard,
    ApiPermissionGuard,
    MongooseModule,
    PermissionsModule,
  ],
})
export class AuthModule {}
