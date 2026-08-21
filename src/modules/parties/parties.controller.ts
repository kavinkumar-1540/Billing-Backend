import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PartiesService } from './parties.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { ListPartiesQueryDto } from './dto/list-parties-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreatePartyDto,
  ) {
    return this.partiesService.create(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: ListPartiesQueryDto,
  ) {
    return this.partiesService.findAll(companyId, query.partyType, query);
  }

  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.partiesService.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.partiesService.update(companyId, id, dto);
  }

  @Delete(':id')
  deactivate(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.partiesService.deactivate(companyId, id);
  }
}
