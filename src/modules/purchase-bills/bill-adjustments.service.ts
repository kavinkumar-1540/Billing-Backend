import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  BillAdjustment,
  BillAdjustmentDocument,
} from './schemas/bill-adjustment.schema';
import {
  PurchaseBill,
  PurchaseBillDocument,
  PurchaseBillStatus,
} from './schemas/purchase-bill.schema';
import { Party, PartyDocument } from '../parties/schemas/party.schema';
import { DocumentSequenceService } from '../document-sequences/document-sequence.service';
import { DocumentType } from '../document-sequences/schemas/document-sequence.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { AuditService } from '../audit/audit.service';
import { CreateBillAdjustmentDto } from './dto/create-bill-adjustment.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';
import { rupeesToPaise } from '../../common/money/money.util';

@Injectable()
export class BillAdjustmentsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(BillAdjustment.name)
    private readonly billAdjustmentModel: Model<BillAdjustmentDocument>,
    @InjectModel(PurchaseBill.name)
    private readonly purchaseBillModel: Model<PurchaseBillDocument>,
    @InjectModel(Party.name) private readonly partyModel: Model<PartyDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    private readonly sequenceService: DocumentSequenceService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Records a financial-only correction against a confirmed purchase bill —
   * reduces balanceDue and the supplier's payable outstanding by the same
   * amount, atomically. Never touches stock or amountPaid: no goods move and
   * no cash changes hands (use debit notes / payments for those).
   */
  async create(
    companyId: string,
    userId: string,
    dto: CreateBillAdjustmentDto,
  ): Promise<BillAdjustmentDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const userObjectId = new Types.ObjectId(userId);
    const amountPaise = rupeesToPaise(dto.amount);

    const company = await this.companyModel.findById(companyObjectId).exec();
    if (!company) throw new NotFoundException('Company not found');

    const session = await this.connection.startSession();
    try {
      let created!: BillAdjustmentDocument;

      await session.withTransaction(async () => {
        const bill = await this.purchaseBillModel
          .findOne({ _id: dto.purchaseBillId, companyId: companyObjectId })
          .session(session)
          .exec();
        if (!bill) throw new NotFoundException('Purchase bill not found');
        if (bill.status === PurchaseBillStatus.CANCELLED) {
          throw new BadRequestException('Cannot adjust a cancelled bill');
        }
        if (amountPaise > bill.balanceDue) {
          throw new BadRequestException(
            "Adjustment amount cannot exceed the bill's balance due",
          );
        }

        const financialYear = this.sequenceService.resolveFinancialYear(
          new Date(dto.date),
          company.financialYearStartMonth,
        );
        const adjustmentNumber = await this.sequenceService.getNextNumber(
          companyObjectId,
          DocumentType.BILL_ADJUSTMENT,
          financialYear,
          session,
        );

        const [adjustment] = await this.billAdjustmentModel.create(
          [
            {
              companyId: companyObjectId,
              purchaseBillId: bill._id,
              adjustmentNumber,
              date: new Date(dto.date),
              adjustmentType: dto.adjustmentType,
              amount: amountPaise,
              reason: dto.reason,
              createdBy: userObjectId,
            },
          ],
          { session },
        );
        created = adjustment;

        const previousBalanceDue = bill.balanceDue;
        const newBalanceDue = previousBalanceDue - amountPaise;
        bill.balanceDue = newBalanceDue;
        bill.status =
          newBalanceDue <= 0
            ? PurchaseBillStatus.PAID
            : PurchaseBillStatus.PARTIALLY_PAID;
        await bill.save({ session });

        await this.partyModel
          .updateOne(
            { _id: bill.supplierId },
            { $inc: { currentOutstanding: -amountPaise } },
          )
          .session(session)
          .exec();

        await this.auditService.record(
          {
            companyId: companyObjectId,
            userId: userObjectId,
            action: 'BILL_ADJUSTMENT_CREATED',
            entity: 'PurchaseBill',
            entityId: bill._id,
            before: { balanceDue: previousBalanceDue },
            after: { balanceDue: newBalanceDue },
            metadata: {
              adjustmentId: adjustment._id,
              adjustmentType: dto.adjustmentType,
              amount: amountPaise,
              reason: dto.reason,
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

  async findAll(companyId: string, query: PaginationQueryDto) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    const result = await paginate(this.billAdjustmentModel, filter, query, {
      date: -1,
    });
    await this.billAdjustmentModel.populate(result.items, {
      path: 'purchaseBillId',
      select: 'billNumber supplierSnapshot',
    });
    return result;
  }

  async findOne(
    companyId: string,
    id: string,
  ): Promise<BillAdjustmentDocument> {
    const adjustment = await this.billAdjustmentModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!adjustment) throw new NotFoundException('Bill adjustment not found');
    return adjustment;
  }
}
