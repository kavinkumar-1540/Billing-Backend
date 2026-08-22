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
import { PlatformUsersService } from './platform-users.service';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdateCompanyUserRoleDto } from '../company-members/dto/update-company-user-role.dto';
import { UpdateCompanyUserStatusDto } from '../company-members/dto/update-company-user-status.dto';
import { UpdateCompanyUserProfileDto } from '../company-members/dto/update-company-user-profile.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';

@ApiTags('platform-users')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('platform-users')
export class PlatformUsersController {
  constructor(private readonly platformUsersService: PlatformUsersService) {}

  @Get()
  findAll() {
    return this.platformUsersService.findAll();
  }

  @Post()
  create(@Body() dto: CreatePlatformUserDto) {
    return this.platformUsersService.create(dto);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateCompanyUserRoleDto) {
    return this.platformUsersService.updateRole(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateCompanyUserStatusDto) {
    return this.platformUsersService.setStatus(id, dto);
  }

  @Patch(':id/profile')
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyUserProfileDto,
  ) {
    return this.platformUsersService.updateProfile(id, dto);
  }
}
