import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  DebitNote,
  DebitNoteDocument,
  DebitNoteStatus,
} from './schemas/debit-note.schema';
import {
  PurchaseBill,
  PurchaseBillDocument,
} from '../purchase-bills/schemas/purchase-bill.schema';
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
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';

@Injectable()
export class DebitNotesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(DebitNote.name)
    private readonly debitNoteModel: Model<DebitNoteDocument>,
    @InjectModel(PurchaseBill.name)
    private readonly purchaseBillModel: Model<PurchaseBillDocument>,
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
   * Issues a purchase debit note against an original bill: recalculates
   * GST for the returned lines, decreases stock for goods (spec §12/§43 —
   * purchase returns decrease inventory), decreases the supplier's payable
   * outstanding, and writes an audit log — all in one transaction. The
   * original bill is never mutated.
   */
  async issue(
    companyId: string,
    userId: string,
    dto: CreateDebitNoteDto,
  ): Promise<DebitNoteDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const userObjectId = new Types.ObjectId(userId);

    const [company, originalBill] = await Promise.all([
      this.companyModel.findById(companyObjectId).exec(),
      this.purchaseBillModel
        .findOne({ _id: dto.originalBillId, companyId: companyObjectId })
        .exec(),
    ]);
    if (!company) throw new NotFoundException('Company not found');
    if (!originalBill)
      throw new NotFoundException('Original purchase bill not found');

    const supplier = await this.partyModel
      .findById(originalBill.supplierId)
      .exec();
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!supplier.stateCode) {
      throw new BadRequestException('Supplier must have a state configured');
    }

    const { embeddedItems, taxSummary, itemsById } =
      await this.lineBuilder.build(
        companyObjectId,
        dto.items,
        company.address?.stateCode ?? '',
        supplier.stateCode,
      );

    const session = await this.connection.startSession();
    try {
      let created!: DebitNoteDocument;

      await session.withTransaction(async () => {
        const financialYear = this.sequenceService.resolveFinancialYear(
          new Date(dto.date),
          company.financialYearStartMonth,
        );
        const noteNumber = await this.sequenceService.getNextNumber(
          companyObjectId,
          DocumentType.DEBIT_NOTE,
          financialYear,
          session,
        );

        const [note] = await this.debitNoteModel.create(
          [
            {
              companyId: companyObjectId,
              noteNumber,
              date: new Date(dto.date),
              originalBillId: originalBill._id,
              supplierId: supplier._id,
              supplierSnapshot: {
                name: supplier.name,
                businessName: supplier.businessName,
                gstin: supplier.gstin,
                state: supplier.state,
                stateCode: supplier.stateCode,
                phone: supplier.phone,
                email: supplier.email,
              },
              reason: dto.reason,
              items: embeddedItems,
              taxSummary,
              inventoryAdjusted: true,
              status: DebitNoteStatus.ISSUED,
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
                movementType: StockMovementType.PURCHASE_RETURN,
                refDocType: 'DEBIT_NOTE',
                refDocId: note._id,
                unitPrice: item.purchasePrice,
                userId: userObjectId,
              },
            ],
            { session },
          );
        }

        await this.partyModel
          .updateOne(
            { _id: supplier._id },
            { $inc: { currentOutstanding: -taxSummary.grandTotal } },
          )
          .session(session)
          .exec();

        await this.auditService.record(
          {
            companyId: companyObjectId,
            userId: userObjectId,
            action: 'DEBIT_NOTE_ISSUED',
            entity: 'DebitNote',
            entityId: note._id,
            after: {
              noteNumber,
              grandTotal: taxSummary.grandTotal,
              supplierId: String(supplier._id),
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
        { 'supplierSnapshot.name': { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.debitNoteModel, filter, query, { date: -1 });
  }

  async findOne(companyId: string, id: string) {
    const note = await this.debitNoteModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!note) throw new NotFoundException('Debit note not found');
    return note;
  }
}
