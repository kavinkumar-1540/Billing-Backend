import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentType,
} from './schemas/payment.schema';
import {
  PaymentAllocation,
  PaymentAllocationDocument,
  AllocationRefType,
} from '../payment-allocations/schemas/payment-allocation.schema';
import { Party, PartyDocument } from '../parties/schemas/party.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import {
  CompanySettings,
  CompanySettingsDocument,
} from '../settings/schemas/company-settings.schema';
import {
  SalesInvoice,
  SalesInvoiceDocument,
  SalesInvoiceStatus,
} from '../sales-invoices/schemas/sales-invoice.schema';
import {
  PurchaseBill,
  PurchaseBillDocument,
  PurchaseBillStatus,
} from '../purchase-bills/schemas/purchase-bill.schema';
import { DocumentSequenceService } from '../document-sequences/document-sequence.service';
import { DocumentType } from '../document-sequences/schemas/document-sequence.schema';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';
import { rupeesToPaise } from '../../common/money/money.util';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(PaymentAllocation.name)
    private readonly paymentAllocationModel: Model<PaymentAllocationDocument>,
    @InjectModel(Party.name) private readonly partyModel: Model<PartyDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(CompanySettings.name)
    private readonly companySettingsModel: Model<CompanySettingsDocument>,
    @InjectModel(SalesInvoice.name)
    private readonly salesInvoiceModel: Model<SalesInvoiceDocument>,
    @InjectModel(PurchaseBill.name)
    private readonly purchaseBillModel: Model<PurchaseBillDocument>,
    private readonly sequenceService: DocumentSequenceService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Records a payment and allocates it across one or more invoices/bills
   * atomically. Validates: allocations sum to the payment amount, each
   * allocation does not exceed that document's remaining balance, and (unless
   * the company allows overpayment) the party's total outstanding is not
   * exceeded. Updates each document's amountPaid/balanceDue/status and the
   * party's currentOutstanding — all inside one MongoDB transaction.
   */
  async record(
    companyId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const amountPaise = rupeesToPaise(dto.amount);

    const allocatedTotal = dto.allocations.reduce(
      (sum, a) => sum + rupeesToPaise(a.amount),
      0,
    );
    if (allocatedTotal !== amountPaise) {
      throw new BadRequestException(
        'Sum of allocations must equal the payment amount',
      );
    }

    const [company, party, settings] = await Promise.all([
      this.companyModel.findById(companyObjectId).exec(),
      this.partyModel
        .findOne({ _id: dto.partyId, companyId: companyObjectId })
        .exec(),
      this.companySettingsModel.findOne({ companyId: companyObjectId }).exec(),
    ]);
    if (!company) throw new NotFoundException('Company not found');
    if (!party) throw new NotFoundException('Party not found');

    if (!settings?.allowOverpayment && amountPaise > party.currentOutstanding) {
      throw new BadRequestException(
        `Payment amount exceeds party's outstanding balance (${party.currentOutstanding / 100})`,
      );
    }

    const session = await this.connection.startSession();
    try {
      let created!: PaymentDocument;

      await session.withTransaction(async () => {
        for (const allocation of dto.allocations) {
          const allocationPaise = rupeesToPaise(allocation.amount);

          if (allocation.refDocType === AllocationRefType.SALES_INVOICE) {
            const invoice = await this.salesInvoiceModel
              .findOne({ _id: allocation.refDocId, companyId: companyObjectId })
              .session(session)
              .exec();
            if (!invoice)
              throw new NotFoundException('Sales invoice not found');
            if (
              !settings?.allowOverpayment &&
              allocationPaise > invoice.balanceDue
            ) {
              throw new BadRequestException(
                `Allocation exceeds balance due on invoice ${invoice.invoiceNumber}`,
              );
            }

            const newAmountPaid = invoice.amountPaid + allocationPaise;
            const newBalanceDue = invoice.taxSummary.grandTotal - newAmountPaid;
            invoice.amountPaid = newAmountPaid;
            invoice.balanceDue = newBalanceDue;
            invoice.status =
              newBalanceDue <= 0
                ? SalesInvoiceStatus.PAID
                : SalesInvoiceStatus.PARTIALLY_PAID;
            await invoice.save({ session });
          } else {
            const bill = await this.purchaseBillModel
              .findOne({ _id: allocation.refDocId, companyId: companyObjectId })
              .session(session)
              .exec();
            if (!bill) throw new NotFoundException('Purchase bill not found');
            if (
              !settings?.allowOverpayment &&
              allocationPaise > bill.balanceDue
            ) {
              throw new BadRequestException(
                `Allocation exceeds balance due on bill ${bill.billNumber}`,
              );
            }

            const newAmountPaid = bill.amountPaid + allocationPaise;
            const newBalanceDue = bill.taxSummary.grandTotal - newAmountPaid;
            bill.amountPaid = newAmountPaid;
            bill.balanceDue = newBalanceDue;
            bill.status =
              newBalanceDue <= 0
                ? PurchaseBillStatus.PAID
                : PurchaseBillStatus.PARTIALLY_PAID;
            await bill.save({ session });
          }
        }

        const financialYear = this.sequenceService.resolveFinancialYear(
          new Date(dto.date),
          company.financialYearStartMonth,
        );
        const paymentNumber = await this.sequenceService.getNextNumber(
          companyObjectId,
          dto.paymentType === PaymentType.RECEIPT
            ? DocumentType.PAYMENT_RECEIPT
            : DocumentType.PAYMENT_PAYMENT,
          financialYear,
          session,
        );

        const [payment] = await this.paymentModel.create(
          [
            {
              companyId: companyObjectId,
              paymentNumber,
              paymentType: dto.paymentType,
              date: new Date(dto.date),
              partyId: party._id,
              amount: amountPaise,
              method: dto.method,
              referenceNumber: dto.referenceNumber,
              bank: dto.bank,
              notes: dto.notes,
            },
          ],
          { session },
        );
        created = payment;

        await this.paymentAllocationModel.insertMany(
          dto.allocations.map((a) => ({
            companyId: companyObjectId,
            paymentId: payment._id,
            refDocType: a.refDocType,
            refDocId: new Types.ObjectId(a.refDocId),
            allocatedAmount: rupeesToPaise(a.amount),
          })),
          { session },
        );

        await this.partyModel
          .updateOne(
            { _id: party._id },
            { $inc: { currentOutstanding: -amountPaise } },
          )
          .session(session)
          .exec();

        await this.auditService.record(
          {
            companyId: companyObjectId,
            action:
              dto.paymentType === PaymentType.RECEIPT
                ? 'PAYMENT_RECEIPT_CREATED'
                : 'SUPPLIER_PAYMENT_CREATED',
            entity: 'Payment',
            entityId: payment._id,
            after: {
              paymentNumber,
              amount: amountPaise,
              partyId: String(party._id),
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

  findAll(
    companyId: string,
    paymentType: PaymentType | undefined,
    query: PaginationQueryDto,
  ) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (paymentType) filter.paymentType = paymentType;
    if (query.search) {
      filter.$or = [
        { paymentNumber: { $regex: query.search, $options: 'i' } },
        { referenceNumber: { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.paymentModel, filter, query, { date: -1 });
  }

  async findOne(companyId: string, id: string) {
    const payment = await this.paymentModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  findAllocations(companyId: string, paymentId: string) {
    return this.paymentAllocationModel
      .find({
        companyId: new Types.ObjectId(companyId),
        paymentId: new Types.ObjectId(paymentId),
      })
      .exec();
  }
}
