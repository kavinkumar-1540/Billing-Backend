import {
  BadRequestException,
  ConflictException,
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

  findAll(): Promise<RoleDocument[]> {
    return this.roleModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  async create(dto: CreateRoleDto): Promise<RoleDocument> {
    const existing = await this.roleModel
      .findOne({ roleKey: dto.roleKey })
      .exec();
    if (existing)
      throw new ConflictException('A role with this key already exists');

    return this.roleModel.create({
      name: dto.name,
      roleKey: dto.roleKey,
      description: dto.description ?? '',
      isSystemDefault: false,
    });
  }

  async update(roleId: string, dto: UpdateRoleDto): Promise<RoleDocument> {
    const role = await this.roleModel.findById(roleId).exec();
    if (!role) throw new NotFoundException('Role not found');

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.active !== undefined) role.active = dto.active;
    await role.save();
    return role;
  }

  async remove(roleId: string): Promise<void> {
    const role = await this.roleModel.findById(roleId).exec();
    if (!role) throw new NotFoundException('Role not found');

    const inUse = await this.companyMemberModel
      .exists({ roleId: new Types.ObjectId(roleId) })
      .exec();
    if (inUse) {
      throw new BadRequestException(
        'Cannot delete a role that is currently assigned to one or more users',
      );
    }

    role.active = false;
    await role.save();
  }
}
