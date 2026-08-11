import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import {
  CompanyMember,
  CompanyMemberDocument,
} from '../company-members/schemas/company-member.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(CompanyMember.name)
    private readonly companyMemberModel: Model<CompanyMemberDocument>,
  ) {}

  findAllForCompany(companyId: string): Promise<RoleDocument[]> {
    return this.roleModel
      .find({
        $or: [
          { companyId: new Types.ObjectId(companyId) },
          { companyId: null },
        ],
      })
      .sort({ isSystemDefault: -1, name: 1 })
      .exec();
  }

  async create(companyId: string, dto: CreateRoleDto): Promise<RoleDocument> {
    const existing = await this.roleModel
      .findOne({ companyId: new Types.ObjectId(companyId), name: dto.name })
      .exec();
    if (existing)
      throw new ConflictException('A role with this name already exists');

    return this.roleModel.create({
      companyId: new Types.ObjectId(companyId),
      name: dto.name,
      permissions: dto.permissions,
      isSystemDefault: false,
    });
  }

  private async loadEditableRole(
    companyId: string,
    roleId: string,
  ): Promise<RoleDocument> {
    const role = await this.roleModel.findById(roleId).exec();
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystemDefault || String(role.companyId) !== companyId) {
      throw new ForbiddenException('System default roles cannot be modified');
    }
    return role;
  }

  async update(
    companyId: string,
    roleId: string,
    dto: UpdateRoleDto,
  ): Promise<RoleDocument> {
    const role = await this.loadEditableRole(companyId, roleId);
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;
    await role.save();
    return role;
  }

  async remove(companyId: string, roleId: string): Promise<void> {
    await this.loadEditableRole(companyId, roleId);
    const inUse = await this.companyMemberModel
      .exists({ roleId: new Types.ObjectId(roleId) })
      .exec();
    if (inUse) {
      throw new BadRequestException(
        'Cannot delete a role that is currently assigned to one or more users',
      );
    }
    await this.roleModel.deleteOne({ _id: roleId }).exec();
  }
}
