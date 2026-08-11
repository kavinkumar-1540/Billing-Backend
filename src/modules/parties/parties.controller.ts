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
import { PartyType } from './schemas/party.schema';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, PermissionsGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @RequirePermissions('parties:manage')
  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreatePartyDto,
  ) {
    return this.partiesService.create(companyId, dto);
  }

  @RequirePermissions('parties:manage')
  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query('partyType') partyType: PartyType | undefined,
    @Query() query: PaginationQueryDto,
  ) {
    return this.partiesService.findAll(companyId, partyType, query);
  }

  @RequirePermissions('parties:manage')
  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.partiesService.findOne(companyId, id);
  }

  @RequirePermissions('parties:manage')
  @Patch(':id')
  update(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.partiesService.update(companyId, id, dto);
  }

  @RequirePermissions('parties:manage')
  @Delete(':id')
  deactivate(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.partiesService.deactivate(companyId, id);
  }
}
