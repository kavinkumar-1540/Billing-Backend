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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions/catalog')
  permissionCatalog() {
    return PERMISSIONS;
  }

  @Get()
  findAll(@CurrentCompany('companyId') companyId: string) {
    return this.rolesService.findAllForCompany(companyId);
  }

  @RequirePermissions('users:manage')
  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(companyId, dto);
  }

  @RequirePermissions('users:manage')
  @Patch(':id')
  update(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(companyId, id, dto);
  }

  @RequirePermissions('users:manage')
  @Delete(':id')
  remove(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.rolesService.remove(companyId, id);
  }
}
