import {
  Body,
  Controller,
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
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('company-members')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@Controller('company-members')
export class CompanyMembersController {
  constructor(private readonly companyMembersService: CompanyMembersService) {}

  @Get()
  findAll(@CurrentCompany('companyId') companyId: string) {
    return this.companyMembersService.findAllForCompany(companyId);
  }

  @RequirePermissions('users:manage')
  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreateCompanyUserDto,
  ) {
    return this.companyMembersService.create(companyId, dto);
  }

  @RequirePermissions('users:manage')
  @Patch(':id/role')
  updateRole(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyUserRoleDto,
  ) {
    return this.companyMembersService.updateRole(companyId, id, dto.roleId);
  }

  @RequirePermissions('users:manage')
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
}
