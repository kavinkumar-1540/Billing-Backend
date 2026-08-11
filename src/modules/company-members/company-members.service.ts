import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  CompanyMember,
  CompanyMemberDocument,
} from './schemas/company-member.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { CompanyUserListItem } from './company-members.types';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class CompanyMembersService {
  constructor(
    @InjectModel(CompanyMember.name)
    private readonly companyMemberModel: Model<CompanyMemberDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async findAllForCompany(companyId: string): Promise<CompanyUserListItem[]> {
    const members = await this.companyMemberModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .populate('userId')
      .populate('roleId')
      .exec();

    return members
      .filter((m) => m.userId && m.roleId)
      .map((m) => {
        const user = m.userId as unknown as UserDocument;
        const role = m.roleId as unknown as RoleDocument;
        return {
          companyMemberId: String(m._id),
          userId: String(user._id),
          name: user.name,
          email: user.email,
          roleId: String(role._id),
          roleName: role.name,
          isActive: m.isActive,
          lastLoginAt: user.lastLoginAt,
        };
      });
  }

  private async assertRoleUsableByCompany(
    companyId: string,
    roleId: string,
  ): Promise<void> {
    const role = await this.roleModel.findById(roleId).exec();
    if (!role) throw new NotFoundException('Role not found');
    const belongsToCompany =
      role.companyId === null || String(role.companyId) === companyId;
    if (!belongsToCompany) {
      throw new BadRequestException('Role does not belong to this company');
    }
  }

  async create(
    companyId: string,
    dto: CreateCompanyUserDto,
  ): Promise<CompanyUserListItem> {
    await this.assertRoleUsableByCompany(companyId, dto.roleId);

    let user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .exec();
    if (!user) {
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      user = await this.userModel.create({
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
      });
    }

    const existingMembership = await this.companyMemberModel
      .findOne({ companyId: new Types.ObjectId(companyId), userId: user._id })
      .exec();
    if (existingMembership) {
      throw new BadRequestException(
        'This user already belongs to this company',
      );
    }

    const member = await this.companyMemberModel.create({
      companyId: new Types.ObjectId(companyId),
      userId: user._id,
      roleId: new Types.ObjectId(dto.roleId),
      isActive: true,
    });

    const role = await this.roleModel.findById(dto.roleId).exec();
    return {
      companyMemberId: String(member._id),
      userId: String(user._id),
      name: user.name,
      email: user.email,
      roleId: dto.roleId,
      roleName: role!.name,
      isActive: true,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async loadMemberScoped(
    companyId: string,
    companyMemberId: string,
  ): Promise<CompanyMemberDocument> {
    const member = await this.companyMemberModel
      .findOne({
        _id: companyMemberId,
        companyId: new Types.ObjectId(companyId),
      })
      .exec();
    if (!member) throw new NotFoundException('Company member not found');
    return member;
  }

  async updateRole(
    companyId: string,
    companyMemberId: string,
    roleId: string,
  ): Promise<void> {
    await this.assertRoleUsableByCompany(companyId, roleId);
    const member = await this.loadMemberScoped(companyId, companyMemberId);
    member.roleId = new Types.ObjectId(roleId);
    await member.save();
  }

  async setActive(
    companyId: string,
    companyMemberId: string,
    isActive: boolean,
    requestingUserId: string,
  ): Promise<void> {
    const member = await this.loadMemberScoped(companyId, companyMemberId);
    if (String(member.userId) === requestingUserId) {
      throw new ForbiddenException(
        'You cannot change your own membership status',
      );
    }
    member.isActive = isActive;
    await member.save();
  }
}
