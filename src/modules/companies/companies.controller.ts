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
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { SkipPermissionCheck } from '../auth/decorators/skip-permission-check.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @SkipPermissionCheck()
  @Get('current')
  findCurrent(@CurrentCompany('companyId') companyId: string) {
    return this.companiesService.findOne(companyId);
  }

  @Patch('current')
  updateCurrent(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(companyId, dto);
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.companiesService.setActive(id, false);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.companiesService.setActive(id, true);
  }

  @Patch(':id')
  updateById(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }
}
