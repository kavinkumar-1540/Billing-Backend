import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { AppConfig } from '../../config/configuration';
import { UsersService } from '../users/users.service';
import {
  CompanyMember,
  CompanyMemberDocument,
} from '../company-members/schemas/company-member.schema';
import { AuthResponseDto, CompanyMembershipDto } from './dto/auth-response.dto';
import { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(CompanyMember.name)
    private readonly companyMemberModel: Model<CompanyMemberDocument>,
  ) {}

  async login(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.usersService.touchLastLogin(String(user._id));

    const companies = await this.loadCompanyMemberships(String(user._id));
    const { accessToken, refreshToken } = this.issueTokens(String(user._id));

    return {
      accessToken,
      refreshToken,
      userId: String(user._id),
      email: user.email,
      name: user.name,
      companies,
    };
  }

  refresh(userId: string): { accessToken: string; refreshToken: string } {
    return this.issueTokens(userId);
  }

  private issueTokens(userId: string): {
    accessToken: string;
    refreshToken: string;
  } {
    const appConfig = this.configService.get<AppConfig>('app')!;

    const accessPayload: AccessTokenPayload = { sub: userId, type: 'access' };
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: appConfig.jwtSecret,
      expiresIn: appConfig.jwtAccessExpiresInSeconds,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: appConfig.jwtRefreshSecret,
      expiresIn: appConfig.jwtRefreshExpiresInSeconds,
    });

    return { accessToken, refreshToken };
  }

  private async loadCompanyMemberships(
    userId: string,
  ): Promise<CompanyMembershipDto[]> {
    const memberships = await this.companyMemberModel
      .find({ userId, isActive: true })
      .populate('companyId')
      .populate('roleId')
      .exec();

    return memberships
      .filter((m) => m.companyId && m.roleId)
      .map((m) => {
        // populated at runtime; typed as ObjectId at rest, so narrow via unknown
        const company = m.companyId as unknown as {
          _id: unknown;
          name: string;
          slug: string;
        };
        const role = m.roleId as unknown as {
          name: string;
          permissions: string[];
        };
        return {
          companyId: String(company._id),
          companyName: company.name,
          companySlug: company.slug,
          roleName: role.name,
          permissions: role.permissions,
        };
      });
  }
}
