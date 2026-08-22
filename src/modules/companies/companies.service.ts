import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Company, CompanyDocument } from './schemas/company.schema';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import {
  CompanyMember,
  CompanyMemberDocument,
} from '../company-members/schemas/company-member.schema';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(CompanyMember.name)
    private readonly companyMemberModel: Model<CompanyMemberDocument>,
  ) {}

  async findOne(companyId: string): Promise<CompanyDocument> {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(
    companyId: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyDocument> {
    if (dto.email) {
      const existingEmail = await this.companyModel
        .findOne({ email: dto.email, isActive: true, _id: { $ne: companyId } })
        .exec();
      if (existingEmail) {
        throw new ConflictException(
          'Another active company already uses this email',
        );
      }
    }

    const company = await this.companyModel
      .findByIdAndUpdate(companyId, { $set: dto }, { new: true })
      .exec();
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async setActive(
    companyId: string,
    isActive: boolean,
  ): Promise<CompanyDocument> {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) throw new NotFoundException('Company not found');

    company.isActive = isActive;
    await company.save();

    await this.companyMemberModel
      .updateMany({ companyId: company._id }, { $set: { isActive } })
      .exec();

    return company;
  }

  async create(dto: CreateCompanyDto): Promise<CompanyDocument> {
    const existingSlug = await this.companyModel
      .findOne({ slug: dto.slug })
      .exec();
    if (existingSlug) {
      throw new ConflictException('A company with this slug already exists');
    }

    const adminRole = await this.roleModel.findOne({ roleKey: 'admin' }).exec();
    if (!adminRole) {
      throw new NotFoundException('Global admin role not found');
    }

    const company = await this.companyModel.create({
      slug: dto.slug,
      name: dto.name,
      legalName: dto.legalName,
      gstin: dto.gstin,
      pan: dto.pan,
      phone: dto.phone,
      email: dto.email,
    });

    let adminUser = await this.userModel
      .findOne({ email: dto.adminEmail.toLowerCase() })
      .exec();
    if (!adminUser) {
      const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);
      adminUser = await this.userModel.create({
        email: dto.adminEmail.toLowerCase(),
        name: dto.adminName,
        passwordHash,
      });
    }

    await this.companyMemberModel.create({
      companyId: company._id,
      userId: adminUser._id,
      roleId: adminRole._id,
      isActive: true,
    });

    return company;
  }

  async findAll(): Promise<CompanyDocument[]> {
    return this.companyModel.find().sort({ createdAt: -1 }).exec();
  }
}
