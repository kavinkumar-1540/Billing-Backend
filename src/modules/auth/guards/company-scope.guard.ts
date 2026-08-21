import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request } from 'express';
import {
  CompanyMember,
  CompanyMemberDocument,
} from '../../company-members/schemas/company-member.schema';
import { Role, RoleDocument } from '../../roles/schemas/role.schema';
import { AuthenticatedUser, RequestCompanyContext } from '../auth.types';

export interface RequestWithCompany extends Request {
  user: AuthenticatedUser;
  companyContext: RequestCompanyContext;
}

/**
 * Enforces multi-tenant isolation: every protected business-data route must
 * carry an `x-company-id` header naming a company the authenticated user is
 * an active member of. Resolves the member's role onto the request so
 * ApiPermissionGuard and services can rely on it without re-querying
 * company_members themselves.
 */
@Injectable()
export class CompanyScopeGuard implements CanActivate {
  constructor(
    @InjectModel(CompanyMember.name)
    private readonly companyMemberModel: Model<CompanyMemberDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithCompany>();
    const companyId = request.headers['x-company-id'];

    if (
      !companyId ||
      typeof companyId !== 'string' ||
      !Types.ObjectId.isValid(companyId)
    ) {
      throw new UnauthorizedException('Missing or invalid x-company-id header');
    }

    const member = await this.companyMemberModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        userId: new Types.ObjectId(request.user.userId),
        isActive: true,
      })
      .exec();

    if (!member) {
      throw new UnauthorizedException('User is not a member of this company');
    }

    const role = await this.roleModel.findById(member.roleId).exec();
    if (!role) {
      throw new UnauthorizedException('Role not found for company membership');
    }

    request.companyContext = {
      companyId,
      roleId: String(role._id),
      roleName: role.name,
      roleKey: role.roleKey,
    };

    return true;
  }
}
