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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { ApiPermissionGuard } from '../auth/guards/api-permission.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard, ApiPermissionGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @CurrentCompany('companyId') companyId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentCompany('companyId') companyId: string) {
    return this.categoriesService.findAll(companyId);
  }

  @Patch(':id')
  update(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(companyId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentCompany('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.remove(companyId, id);
  }
}
