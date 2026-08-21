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
import { BillAdjustmentsService } from './bill-adjustments.service';
import { CreateBillAdjustmentDto } from './dto/create-bill-adjustment.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('bill-adjustments')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('bill-adjustments')
export class BillAdjustmentsController {
  constructor(
    private readonly billAdjustmentsService: BillAdjustmentsService,
  ) {}

  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBillAdjustmentDto,
  ) {
    return this.billAdjustmentsService.create(companyId, userId, dto);
  }

  @Get()
  findAll(
    @CurrentCompany('companyId') companyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.billAdjustmentsService.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.billAdjustmentsService.findOne(companyId, id);
  }
}
