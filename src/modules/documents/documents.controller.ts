import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { PdfDocumentType } from './documents.types';
import { CompanyScopeGuard } from '../auth/guards/company-scope.guard';
import { CurrentCompany } from '../auth/decorators/current-company.decorator';
import { PermissionKey } from '../permissions/permissions.constants';

const DOC_TYPE_PERMISSIONS: Record<PdfDocumentType, PermissionKey> = {
  'sales-order': 'sales:view',
  'sales-invoice': 'sales:view',
  'purchase-order': 'purchase:view',
  'purchase-bill': 'purchase:view',
  'credit-note': 'sales:view',
  'debit-note': 'purchase:view',
};

const VALID_DOC_TYPES = Object.keys(DOC_TYPE_PERMISSIONS) as PdfDocumentType[];

function assertValidDocType(
  docType: string,
  grantedPermissions: readonly string[],
): PdfDocumentType {
  if (!VALID_DOC_TYPES.includes(docType as PdfDocumentType)) {
    throw new BadRequestException(`Unknown document type: ${docType}`);
  }
  const type = docType as PdfDocumentType;
  if (!grantedPermissions.includes(DOC_TYPE_PERMISSIONS[type])) {
    throw new ForbiddenException('Insufficient permissions for this action');
  }
  return type;
}

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(CompanyScopeGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':docType/:id/preview')
  @Header('Content-Type', 'text/html')
  async preview(
    @CurrentCompany('companyId') companyId: string,
    @CurrentCompany('permissions') permissions: string[],
    @Param('docType') docType: string,
    @Param('id') id: string,
  ): Promise<string> {
    return this.documentsService.renderHtml(
      companyId,
      assertValidDocType(docType, permissions),
      id,
    );
  }

  @Get(':docType/:id/pdf')
  async pdf(
    @CurrentCompany('companyId') companyId: string,
    @CurrentCompany('permissions') permissions: string[],
    @Param('docType') docType: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const type = assertValidDocType(docType, permissions);
    const buffer = await this.documentsService.renderPdf(companyId, type, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${type}-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
