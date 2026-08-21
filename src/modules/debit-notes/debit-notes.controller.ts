import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DebitNotesService } from './debit-notes.service';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('debit-notes')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('debit-notes')
export class DebitNotesController {
  constructor(private readonly debitNotesService: DebitNotesService) {}

  @Post()
  issue(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDebitNoteDto,
  ) {
    return this.debitNotesService.issue(companyId, userId, dto);
  }

  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.debitNotesService.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.debitNotesService.findOne(companyId, id);
  }
}
