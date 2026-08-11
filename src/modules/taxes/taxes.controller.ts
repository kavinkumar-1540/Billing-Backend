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
import { TaxesService } from './taxes.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('taxes')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@Controller('tax-rates')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @RequirePermissions('settings:manage')
  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreateTaxRateDto,
  ) {
    return this.taxesService.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentCompany('companyId') companyId: string) {
    return this.taxesService.findAll(companyId);
  }

  @RequirePermissions('settings:manage')
  @Patch(':id')
  update(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxRateDto,
  ) {
    return this.taxesService.update(companyId, id, dto);
  }

  @RequirePermissions('settings:manage')
  @Delete(':id')
  deactivate(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.taxesService.deactivate(companyId, id);
  }
}
