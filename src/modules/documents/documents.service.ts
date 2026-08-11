import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import {
  CompanySettings,
  CompanySettingsDocument,
} from '../settings/schemas/company-settings.schema';
import {
  SalesOrder,
  SalesOrderDocument,
} from '../sales-orders/schemas/sales-order.schema';
import {
  SalesInvoice,
  SalesInvoiceDocument,
} from '../sales-invoices/schemas/sales-invoice.schema';
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  PurchaseBill,
  PurchaseBillDocument,
} from '../purchase-bills/schemas/purchase-bill.schema';
import {
  CreditNote,
  CreditNoteDocument,
} from '../credit-notes/schemas/credit-note.schema';
import {
  DebitNote,
  DebitNoteDocument,
} from '../debit-notes/schemas/debit-note.schema';
import { PdfRenderService } from './pdf-render.service';
import { renderDocumentHtml } from './invoice-template';
import {
  CompanyHeaderInfo,
  PdfDocumentType,
  RenderableDocument,
} from './documents.types';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(CompanySettings.name)
    private readonly settingsModel: Model<CompanySettingsDocument>,
    @InjectModel(SalesOrder.name)
    private readonly salesOrderModel: Model<SalesOrderDocument>,
    @InjectModel(SalesInvoice.name)
    private readonly salesInvoiceModel: Model<SalesInvoiceDocument>,
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(PurchaseBill.name)
    private readonly purchaseBillModel: Model<PurchaseBillDocument>,
    @InjectModel(CreditNote.name)
    private readonly creditNoteModel: Model<CreditNoteDocument>,
    @InjectModel(DebitNote.name)
    private readonly debitNoteModel: Model<DebitNoteDocument>,
    private readonly pdfRenderService: PdfRenderService,
  ) {}

  private async loadRenderable(
    companyId: string,
    docType: PdfDocumentType,
    id: string,
  ): Promise<RenderableDocument> {
    const filter = {
      _id: new Types.ObjectId(id),
      companyId: new Types.ObjectId(companyId),
    };

    switch (docType) {
      case 'sales-order': {
        const doc = await this.salesOrderModel.findOne(filter).exec();
        if (!doc) throw new NotFoundException('Sales order not found');
        return {
          docTypeLabel: 'Sales Order',
          docNumber: doc.orderNumber,
          date: doc.orderDate,
          party: doc.customerSnapshot,
          partyLabel: 'Bill To',
          items: doc.items,
          taxSummary: doc.taxSummary,
          status: doc.status,
          extraFields: doc.expectedDeliveryDate
            ? [
                {
                  label: 'Expected Delivery',
                  value: new Date(doc.expectedDeliveryDate).toLocaleDateString(
                    'en-IN',
                  ),
                },
              ]
            : undefined,
        };
      }
      case 'sales-invoice': {
        const doc = await this.salesInvoiceModel.findOne(filter).exec();
        if (!doc) throw new NotFoundException('Sales invoice not found');
        return {
          docTypeLabel: 'Tax Invoice',
          docNumber: doc.invoiceNumber,
          date: doc.invoiceDate,
          dueDate: doc.dueDate,
          placeOfSupply: doc.placeOfSupply,
          party: doc.customerSnapshot,
          partyLabel: 'Bill To',
          items: doc.items,
          taxSummary: doc.taxSummary,
          status: doc.status,
        };
      }
      case 'purchase-order': {
        const doc = await this.purchaseOrderModel.findOne(filter).exec();
        if (!doc) throw new NotFoundException('Purchase order not found');
        return {
          docTypeLabel: 'Purchase Order',
          docNumber: doc.poNumber,
          date: doc.orderDate,
          party: doc.supplierSnapshot,
          partyLabel: 'Vendor',
          items: doc.items,
          taxSummary: doc.taxSummary,
          status: doc.status,
        };
      }
      case 'purchase-bill': {
        const doc = await this.purchaseBillModel.findOne(filter).exec();
        if (!doc) throw new NotFoundException('Purchase bill not found');
        return {
          docTypeLabel: 'Purchase Bill',
          docNumber: doc.billNumber,
          date: doc.billDate,
          placeOfSupply: doc.placeOfSupply,
          party: doc.supplierSnapshot,
          partyLabel: 'Vendor',
          items: doc.items,
          taxSummary: doc.taxSummary,
          status: doc.status,
          extraFields: doc.supplierInvoiceNumber
            ? [
                {
                  label: 'Supplier Invoice #',
                  value: doc.supplierInvoiceNumber,
                },
              ]
            : undefined,
        };
      }
      case 'credit-note': {
        const doc = await this.creditNoteModel.findOne(filter).exec();
        if (!doc) throw new NotFoundException('Credit note not found');
        return {
          docTypeLabel: 'Credit Note',
          docNumber: doc.noteNumber,
          date: doc.date,
          reason: doc.reason,
          party: doc.customerSnapshot,
          partyLabel: 'Bill To',
          items: doc.items,
          taxSummary: doc.taxSummary,
          status: doc.status,
        };
      }
      case 'debit-note': {
        const doc = await this.debitNoteModel.findOne(filter).exec();
        if (!doc) throw new NotFoundException('Debit note not found');
        return {
          docTypeLabel: 'Debit Note',
          docNumber: doc.noteNumber,
          date: doc.date,
          reason: doc.reason,
          party: doc.supplierSnapshot,
          partyLabel: 'Vendor',
          items: doc.items,
          taxSummary: doc.taxSummary,
          status: doc.status,
        };
      }
    }
  }

  async renderHtml(
    companyId: string,
    docType: PdfDocumentType,
    id: string,
  ): Promise<string> {
    const [renderable, company, settings] = await Promise.all([
      this.loadRenderable(companyId, docType, id),
      this.companyModel.findById(companyId).exec(),
      this.settingsModel
        .findOne({ companyId: new Types.ObjectId(companyId) })
        .exec(),
    ]);
    if (!company) throw new NotFoundException('Company not found');

    const companyHeader: CompanyHeaderInfo = {
      name: company.name,
      legalName: company.legalName,
      address: company.address
        ? {
            line1: company.address.line1,
            line2: company.address.line2,
            city: company.address.city,
            state: company.address.state,
            pincode: company.address.pincode,
          }
        : undefined,
      gstin: company.gstin,
      pan: company.pan,
      phone: company.phone,
      email: company.email,
    };

    return renderDocumentHtml(
      renderable,
      companyHeader,
      settings?.invoiceConfig,
    );
  }

  async renderPdf(
    companyId: string,
    docType: PdfDocumentType,
    id: string,
  ): Promise<Buffer> {
    const html = await this.renderHtml(companyId, docType, id);
    return this.pdfRenderService.renderPdf(html);
  }
}
