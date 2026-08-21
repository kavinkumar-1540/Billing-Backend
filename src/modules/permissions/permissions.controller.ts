import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { SkipPermissionCheck } from '../auth/decorators/skip-permission-check.decorator';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @SkipPermissionCheck()
  @Get('modules')
  findAllModules() {
    return this.permissionsService.findAllModules();
  }

  @SkipPermissionCheck()
  @Get('by-role/:roleKey')
  getRoleBasedPermissions(@Param('roleKey') roleKey: string) {
    return this.permissionsService.getRoleBasedPermissions(roleKey);
  }

  @SkipPermissionCheck()
  @Get('resolved/:roleKey')
  getResolvedPermissionKeys(@Param('roleKey') roleKey: string) {
    return this.permissionsService.getResolvedPermissionKeys(roleKey);
  }

  @Post()
  createPermissions(@Body() dtos: CreatePermissionDto[]) {
    return this.permissionsService.createPermissions(dtos);
  }
}
