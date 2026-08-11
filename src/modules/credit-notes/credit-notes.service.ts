import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  CreditNote,
  CreditNoteDocument,
  CreditNoteStatus,
} from './schemas/credit-note.schema';
import {
  SalesInvoice,
  SalesInvoiceDocument,
} from '../sales-invoices/schemas/sales-invoice.schema';
import { Party, PartyDocument } from '../parties/schemas/party.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Item, ItemDocument, ItemType } from '../items/schemas/item.schema';
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
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';

@Injectable()
export class CreditNotesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CreditNote.name)
    private readonly creditNoteModel: Model<CreditNoteDocument>,
    @InjectModel(SalesInvoice.name)
    private readonly salesInvoiceModel: Model<SalesInvoiceDocument>,
    @InjectModel(Party.name) private readonly partyModel: Model<PartyDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    private readonly lineBuilder: DocumentLineBuilderService,
    private readonly sequenceService: DocumentSequenceService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Issues a sales credit note against an original invoice: recalculates
   * GST for the returned lines, increases stock for goods (spec §12/§43 —
   * sales returns increase inventory), decreases the customer's payable
   * outstanding, and writes an audit log — all in one transaction. The
   * original invoice is never mutated; the note stands as its own record.
   */
  async issue(
    companyId: string,
    userId: string,
    dto: CreateCreditNoteDto,
  ): Promise<CreditNoteDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const userObjectId = new Types.ObjectId(userId);

    const [company, originalInvoice] = await Promise.all([
      this.companyModel.findById(companyObjectId).exec(),
      this.salesInvoiceModel
        .findOne({ _id: dto.originalInvoiceId, companyId: companyObjectId })
        .exec(),
    ]);
    if (!company) throw new NotFoundException('Company not found');
    if (!originalInvoice)
      throw new NotFoundException('Original invoice not found');

    const customer = await this.partyModel
      .findById(originalInvoice.customerId)
      .exec();
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.stateCode) {
      throw new BadRequestException('Customer must have a state configured');
    }

    const { embeddedItems, taxSummary, itemsById } =
      await this.lineBuilder.build(
        companyObjectId,
        dto.items,
        company.address?.stateCode ?? '',
        customer.stateCode,
      );

    const session = await this.connection.startSession();
    try {
      let created!: CreditNoteDocument;

      await session.withTransaction(async () => {
        const financialYear = this.sequenceService.resolveFinancialYear(
          new Date(dto.date),
          company.financialYearStartMonth,
        );
        const noteNumber = await this.sequenceService.getNextNumber(
          companyObjectId,
          DocumentType.CREDIT_NOTE,
          financialYear,
          session,
        );

        const [note] = await this.creditNoteModel.create(
          [
            {
              companyId: companyObjectId,
              noteNumber,
              date: new Date(dto.date),
              originalInvoiceId: originalInvoice._id,
              customerId: customer._id,
              customerSnapshot: {
                name: customer.name,
                businessName: customer.businessName,
                gstin: customer.gstin,
                state: customer.state,
                stateCode: customer.stateCode,
                phone: customer.phone,
                email: customer.email,
              },
              reason: dto.reason,
              items: embeddedItems,
              taxSummary,
              inventoryAdjusted: true,
              status: CreditNoteStatus.ISSUED,
            },
          ],
          { session },
        );
        created = note;

        for (const line of dto.items) {
          const item = itemsById.get(line.itemId)!;
          if (item.itemType !== ItemType.GOODS) continue;

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
                refDocType: 'CREDIT_NOTE',
                refDocId: note._id,
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
            { $inc: { currentOutstanding: -taxSummary.grandTotal } },
          )
          .session(session)
          .exec();

        await this.auditService.record(
          {
            companyId: companyObjectId,
            userId: userObjectId,
            action: 'CREDIT_NOTE_ISSUED',
            entity: 'CreditNote',
            entityId: note._id,
            after: {
              noteNumber,
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

  findAll(companyId: string, query: PaginationQueryDto) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.search) {
      filter.$or = [
        { noteNumber: { $regex: query.search, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.creditNoteModel, filter, query, { date: -1 });
  }

  async findOne(companyId: string, id: string) {
    const note = await this.creditNoteModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!note) throw new NotFoundException('Credit note not found');
    return note;
  }
}
