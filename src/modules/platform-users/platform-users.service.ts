import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  CompanyMember,
  CompanyMemberDocument,
} from '../company-members/schemas/company-member.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdateCompanyUserRoleDto } from '../company-members/dto/update-company-user-role.dto';
import { UpdateCompanyUserStatusDto } from '../company-members/dto/update-company-user-status.dto';
import { UpdateCompanyUserProfileDto } from '../company-members/dto/update-company-user-profile.dto';
import { PlatformUserListItem } from './platform-users.types';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class PlatformUsersService {
  constructor(
    @InjectModel(CompanyMember.name)
    private readonly companyMemberModel: Model<CompanyMemberDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
  ) {}

  async findAll(): Promise<PlatformUserListItem[]> {
    const members = await this.companyMemberModel
      .find()
      .populate('userId')
      .populate('roleId')
      .populate('companyId')
      .exec();

    return members
      .map((m) => {
        const user = m.userId as unknown as UserDocument;
        const role = m.roleId as unknown as RoleDocument;
        const company = m.companyId as unknown as CompanyDocument;
        return {
          companyMemberId: String(m._id),
          userId: String(user._id),
          name: user.name,
          email: user.email,
          roleId: String(role._id),
          roleName: role.name,
          companyId: String(company._id),
          companyName: company.name,
          isActive: m.isActive,
          lastLoginAt: user.lastLoginAt,
        };
      })
      .sort(
        (a, b) =>
          a.companyName.localeCompare(b.companyName) ||
          a.name.localeCompare(b.name),
      );
  }

  async create(dto: CreatePlatformUserDto): Promise<PlatformUserListItem> {
    const company = await this.companyModel.findById(dto.companyId).exec();
    if (!company) throw new NotFoundException('Company not found');

    const role = await this.roleModel.findById(dto.roleId).exec();
    if (!role) throw new NotFoundException('Role not found');

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

    const existing = await this.companyMemberModel
      .findOne({ companyId: company._id, userId: user._id })
      .exec();
    if (existing) {
      throw new BadRequestException(
        'This user is already a member of that company',
      );
    }

    const member = await this.companyMemberModel.create({
      companyId: company._id,
      userId: user._id,
      roleId: role._id,
      isActive: dto.isActive ?? true,
    });

    return {
      companyMemberId: String(member._id),
      userId: String(user._id),
      name: user.name,
      email: user.email,
      roleId: String(role._id),
      roleName: role.name,
      companyId: String(company._id),
      companyName: company.name,
      isActive: member.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async loadMember(
    companyMemberId: string,
  ): Promise<CompanyMemberDocument> {
    const member = await this.companyMemberModel
      .findById(companyMemberId)
      .exec();
    if (!member) throw new NotFoundException('Company member not found');
    return member;
  }

  async updateRole(
    companyMemberId: string,
    dto: UpdateCompanyUserRoleDto,
  ): Promise<void> {
    const member = await this.loadMember(companyMemberId);
    member.roleId = new Types.ObjectId(dto.roleId);
    await member.save();
  }

  async setStatus(
    companyMemberId: string,
    dto: UpdateCompanyUserStatusDto,
  ): Promise<void> {
    const member = await this.loadMember(companyMemberId);
    member.isActive = dto.isActive;
    await member.save();
  }

  async updateProfile(
    companyMemberId: string,
    dto: UpdateCompanyUserProfileDto,
  ): Promise<void> {
    const member = await this.loadMember(companyMemberId);
    if (dto.email) {
      const existing = await this.userModel
        .findOne({
          email: dto.email.toLowerCase(),
          _id: { $ne: member.userId },
        })
        .exec();
      if (existing)
        throw new BadRequestException('Another user already uses this email');
    }
    await this.userModel
      .updateOne(
        { _id: member.userId },
        {
          $set: {
            ...(dto.name ? { name: dto.name } : {}),
            ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
          },
        },
      )
      .exec();
  }
}
