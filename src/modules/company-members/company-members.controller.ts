import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyMembersService } from './company-members.service';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserRoleDto } from './dto/update-company-user-role.dto';
import { UpdateCompanyUserStatusDto } from './dto/update-company-user-status.dto';
import { UpdateCompanyUserProfileDto } from './dto/update-company-user-profile.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { SkipPermissionCheck } from '../auth/decorators/skip-permission-check.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('company-members')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('company-members')
export class CompanyMembersController {
  constructor(private readonly companyMembersService: CompanyMembersService) {}

  @SkipPermissionCheck()
  @Get()
  findAll(@CurrentCompany('companyId') companyId: string) {
    return this.companyMembersService.findAllForCompany(companyId);
  }

  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreateCompanyUserDto,
  ) {
    return this.companyMembersService.create(companyId, dto);
  }

  @Patch(':id/role')
  updateRole(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyUserRoleDto,
  ) {
    return this.companyMembersService.updateRole(companyId, id, dto.roleId);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') requestingUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyUserStatusDto,
  ) {
    return this.companyMembersService.setActive(
      companyId,
      id,
      dto.isActive,
      requestingUserId,
    );
  }

  @Patch(':id/profile')
  updateProfile(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyUserProfileDto,
  ) {
    return this.companyMembersService.updateProfile(companyId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') requestingUserId: string,
    @Param('id') id: string,
  ) {
    return this.companyMembersService.remove(companyId, id, requestingUserId);
  }
}
