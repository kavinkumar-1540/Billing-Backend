import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  SalesInvoice,
  SalesInvoiceDocument,
  SalesInvoiceStatus,
} from './schemas/sales-invoice.schema';
import {
  SalesOrder,
  SalesOrderDocument,
  SalesOrderStatus,
} from '../sales-orders/schemas/sales-order.schema';
import { Party, PartyDocument } from '../parties/schemas/party.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Item, ItemDocument, ItemType } from '../items/schemas/item.schema';
import {
  CompanySettings,
  CompanySettingsDocument,
} from '../settings/schemas/company-settings.schema';
import {
  StockMovement,
  StockMovementDocument,
  StockDirection,
  StockMovementType,
} from '../stock-movements/schemas/stock-movement.schema';
import { DocumentLineBuilderService } from '../taxes/document-line-builder.service';
import { DocumentSequenceService } from '../document-sequences/document-sequence.service';
import { DocumentType } from '../document-sequences/schemas/document-sequence.schema';
import { AuditService } from '../audit/audit.service';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';

@Injectable()
export class SalesInvoicesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(SalesInvoice.name)
    private readonly salesInvoiceModel: Model<SalesInvoiceDocument>,
    @InjectModel(SalesOrder.name)
    private readonly salesOrderModel: Model<SalesOrderDocument>,
    @InjectModel(Party.name) private readonly partyModel: Model<PartyDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
    @InjectModel(CompanySettings.name)
    private readonly companySettingsModel: Model<CompanySettingsDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    private readonly lineBuilder: DocumentLineBuilderService,
    private readonly sequenceService: DocumentSequenceService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Issues a sales invoice atomically: validates customer/items/stock,
   * recalculates GST, generates the invoice number, creates the invoice,
   * decrements stock for goods lines, records stock movements, updates the
   * customer's outstanding balance, and writes an audit log — all inside a
   * single MongoDB transaction. See DEVELOPMENT_PLAN.md §50.
   */
  async issue(
    companyId: string,
    userId: string,
    dto: CreateSalesInvoiceDto,
  ): Promise<SalesInvoiceDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const userObjectId = new Types.ObjectId(userId);

    const [company, customer, settings] = await Promise.all([
      this.companyModel.findById(companyObjectId).exec(),
      this.partyModel
        .findOne({ _id: dto.customerId, companyId: companyObjectId })
        .exec(),
      this.companySettingsModel.findOne({ companyId: companyObjectId }).exec(),
    ]);
    if (!company) throw new NotFoundException('Company not found');
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.stateCode) {
      throw new BadRequestException(
        'Customer must have a state/place of supply configured',
      );
    }

    const { embeddedItems, taxSummary, itemsById } =
      await this.lineBuilder.build(
        companyObjectId,
        dto.items,
        company.address?.stateCode ?? '',
        customer.stateCode,
      );

    // Validate stock availability up front for a clear error before opening the transaction.
    if (!settings?.allowNegativeStock) {
      for (const line of dto.items) {
        const item = itemsById.get(line.itemId)!;
        if (
          item.itemType === ItemType.GOODS &&
          item.currentStock < line.quantity
        ) {
          throw new BadRequestException(
            `Insufficient stock for "${item.name}": available ${item.currentStock}, requested ${line.quantity}`,
          );
        }
      }
    }

    const session = await this.connection.startSession();
    try {
      let created!: SalesInvoiceDocument;

      await session.withTransaction(async () => {
        const financialYear = this.sequenceService.resolveFinancialYear(
          new Date(dto.invoiceDate),
          company.financialYearStartMonth,
        );
        const invoiceNumber = await this.sequenceService.getNextNumber(
          companyObjectId,
          DocumentType.SALES_INVOICE,
          financialYear,
          session,
        );

        const [invoice] = await this.salesInvoiceModel.create(
          [
            {
              companyId: companyObjectId,
              invoiceNumber,
              invoiceDate: new Date(dto.invoiceDate),
              dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
              salesOrderId: dto.salesOrderId
                ? new Types.ObjectId(dto.salesOrderId)
                : undefined,
              customerId: customer._id,
              customerSnapshot: {
                name: customer.name,
                businessName: customer.businessName,
                gstin: customer.gstin,
                address: customer.billingAddress,
                state: customer.state,
                stateCode: customer.stateCode,
                phone: customer.phone,
                email: customer.email,
              },
              placeOfSupply: customer.state ?? customer.stateCode,
              items: embeddedItems,
              taxSummary,
              amountPaid: 0,
              balanceDue: taxSummary.grandTotal,
              paymentMethod: dto.paymentMethod,
              status: SalesInvoiceStatus.ISSUED,
            },
          ],
          { session },
        );
        created = invoice;

        for (const line of dto.items) {
          const item = itemsById.get(line.itemId)!;
          if (item.itemType !== ItemType.GOODS) continue;

          await this.itemModel
            .updateOne(
              { _id: item._id },
              { $inc: { currentStock: -line.quantity } },
            )
            .session(session)
            .exec();

          await this.stockMovementModel.create(
            [
              {
                companyId: companyObjectId,
                itemId: item._id,
                quantity: line.quantity,
                direction: StockDirection.OUT,
                movementType: StockMovementType.SALE,
                refDocType: 'SALES_INVOICE',
                refDocId: invoice._id,
                unitPrice: item.sellingPrice,
                userId: userObjectId,
              },
            ],
            { session },
          );
        }

        await this.partyModel
          .updateOne(
            { _id: customer._id },
            { $inc: { currentOutstanding: taxSummary.grandTotal } },
          )
          .session(session)
          .exec();

        if (dto.salesOrderId) {
          await this.salesOrderModel
            .updateOne(
              { _id: dto.salesOrderId, companyId: companyObjectId },
              {
                status: SalesOrderStatus.INVOICED,
                $push: { invoiceIds: invoice._id },
              },
            )
            .session(session)
            .exec();
        }

        await this.auditService.record(
          {
            companyId: companyObjectId,
            userId: userObjectId,
            action: 'SALES_INVOICE_ISSUED',
            entity: 'SalesInvoice',
            entityId: invoice._id,
            after: {
              invoiceNumber,
              grandTotal: taxSummary.grandTotal,
              customerId: String(customer._id),
            },
          },
          session,
        );
      });

      return created;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Converts a confirmed sales order into an invoice: rebuilds the raw
   * rupee-denominated line inputs from the order's already-priced embedded
   * items, then delegates to issue() so GST is recalculated fresh rather
   * than copied — item/tax-rate masters may have changed since the order.
   */
  async convertFromOrder(
    companyId: string,
    userId: string,
    salesOrderId: string,
    invoiceDate: string,
  ): Promise<SalesInvoiceDocument> {
    const order = await this.salesOrderModel
      .findOne({ _id: salesOrderId, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!order) throw new NotFoundException('Sales order not found');
    if (order.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot invoice a cancelled sales order');
    }
    if (order.status === SalesOrderStatus.INVOICED) {
      throw new BadRequestException('Sales order has already been invoiced');
    }

    const dto: CreateSalesInvoiceDto = {
      customerId: String(order.customerId),
      invoiceDate,
      salesOrderId: String(order._id),
      items: order.items.map((line) => ({
        itemId: String(line.itemId),
        quantity: line.quantity,
        rate: line.rate / 100, // stored in paise; issue() expects rupees
        discountPercent: line.discountPercent,
      })),
    };

    return this.issue(companyId, userId, dto);
  }

  findAll(companyId: string, query: PaginationQueryDto) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.search) {
      filter.$or = [
        { invoiceNumber: { $regex: query.search, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.salesInvoiceModel, filter, query, { invoiceDate: -1 });
  }

  async findOne(companyId: string, id: string) {
    const invoice = await this.salesInvoiceModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!invoice) throw new NotFoundException('Sales invoice not found');
    return invoice;
  }

  /**
   * Cancellation never deletes the invoice: it reverses stock and customer
   * outstanding, marks the invoice CANCELLED with a mandatory reason, and
   * writes an audit log — the historical document remains queryable.
   */
  async cancel(
    companyId: string,
    userId: string,
    id: string,
    dto: CancelInvoiceDto,
  ): Promise<SalesInvoiceDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const userObjectId = new Types.ObjectId(userId);

    const session = await this.connection.startSession();
    try {
      let updated!: SalesInvoiceDocument;

      await session.withTransaction(async () => {
        const invoice = await this.salesInvoiceModel
          .findOne({ _id: id, companyId: companyObjectId })
          .session(session)
          .exec();
        if (!invoice) throw new NotFoundException('Sales invoice not found');
        if (invoice.status === SalesInvoiceStatus.CANCELLED) {
          throw new BadRequestException('Invoice is already cancelled');
        }

        for (const line of invoice.items) {
          if (!line.itemId) continue;
          const item = await this.itemModel
            .findById(line.itemId)
            .session(session)
            .exec();
          if (!item || item.itemType !== ItemType.GOODS) continue;

          await this.itemModel
            .updateOne(
              { _id: item._id },
              { $inc: { currentStock: line.quantity } },
            )
            .session(session)
            .exec();

          await this.stockMovementModel.create(
            [
              {
                companyId: companyObjectId,
                itemId: item._id,
                quantity: line.quantity,
                direction: StockDirection.IN,
                movementType: StockMovementType.SALE_RETURN,
                refDocType: 'SALES_INVOICE_CANCELLATION',
                refDocId: invoice._id,
                unitPrice: item.sellingPrice,
                userId: userObjectId,
              },
            ],
            { session },
          );
        }

        const outstandingReduction =
          invoice.taxSummary.grandTotal - invoice.amountPaid;
        await this.partyModel
          .updateOne(
            { _id: invoice.customerId },
            { $inc: { currentOutstanding: -outstandingReduction } },
          )
          .session(session)
          .exec();

        invoice.status = SalesInvoiceStatus.CANCELLED;
        invoice.cancelledReason = dto.reason;
        invoice.cancelledAt = new Date();
        await invoice.save({ session });
        updated = invoice;

        await this.auditService.record(
          {
            companyId: companyObjectId,
            userId: userObjectId,
            action: 'SALES_INVOICE_CANCELLED',
            entity: 'SalesInvoice',
            entityId: invoice._id,
            metadata: { reason: dto.reason },
          },
          session,
        );
      });

      return updated;
    } finally {
      await session.endSession();
    }
  }
}
