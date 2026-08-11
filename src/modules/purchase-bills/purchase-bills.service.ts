import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  PurchaseBill,
  PurchaseBillDocument,
  PurchaseBillStatus,
} from './schemas/purchase-bill.schema';
import {
  PurchaseOrder,
  PurchaseOrderDocument,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
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
import { CreatePurchaseBillDto } from './dto/create-purchase-bill.dto';
import { CancelPurchaseBillDto } from './dto/cancel-purchase-bill.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';

@Injectable()
export class PurchaseBillsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(PurchaseBill.name)
    private readonly purchaseBillModel: Model<PurchaseBillDocument>,
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
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
   * Confirms a purchase bill atomically: validates supplier/items,
   * recalculates GST, generates the bill number, creates the bill,
   * increments stock for goods lines, records stock movements, updates the
   * supplier's payable outstanding, and writes an audit log — all inside a
   * single MongoDB transaction (mirrors sales invoice issuance, spec §17/§50).
   */
  async confirm(
    companyId: string,
    userId: string,
    dto: CreatePurchaseBillDto,
  ): Promise<PurchaseBillDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const userObjectId = new Types.ObjectId(userId);

    const [company, supplier] = await Promise.all([
      this.companyModel.findById(companyObjectId).exec(),
      this.partyModel
        .findOne({ _id: dto.supplierId, companyId: companyObjectId })
        .exec(),
    ]);
    if (!company) throw new NotFoundException('Company not found');
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
      let created!: PurchaseBillDocument;

      await session.withTransaction(async () => {
        const financialYear = this.sequenceService.resolveFinancialYear(
          new Date(dto.billDate),
          company.financialYearStartMonth,
        );
        const billNumber = await this.sequenceService.getNextNumber(
          companyObjectId,
          DocumentType.PURCHASE_BILL,
          financialYear,
          session,
        );

        const [bill] = await this.purchaseBillModel.create(
          [
            {
              companyId: companyObjectId,
              billNumber,
              supplierInvoiceNumber: dto.supplierInvoiceNumber,
              billDate: new Date(dto.billDate),
              purchaseOrderId: dto.purchaseOrderId
                ? new Types.ObjectId(dto.purchaseOrderId)
                : undefined,
              supplierId: supplier._id,
              supplierSnapshot: {
                name: supplier.name,
                businessName: supplier.businessName,
                gstin: supplier.gstin,
                address: supplier.billingAddress,
                state: supplier.state,
                stateCode: supplier.stateCode,
                phone: supplier.phone,
                email: supplier.email,
              },
              placeOfSupply: supplier.state ?? supplier.stateCode,
              items: embeddedItems,
              taxSummary,
              amountPaid: 0,
              balanceDue: taxSummary.grandTotal,
              status: PurchaseBillStatus.CONFIRMED,
            },
          ],
          { session },
        );
        created = bill;

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
                movementType: StockMovementType.PURCHASE,
                refDocType: 'PURCHASE_BILL',
                refDocId: bill._id,
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
            { $inc: { currentOutstanding: taxSummary.grandTotal } },
          )
          .session(session)
          .exec();

        if (dto.purchaseOrderId) {
          await this.purchaseOrderModel
            .updateOne(
              { _id: dto.purchaseOrderId, companyId: companyObjectId },
              {
                status: PurchaseOrderStatus.RECEIVED,
                $push: { billIds: bill._id },
              },
            )
            .session(session)
            .exec();
        }

        await this.auditService.record(
          {
            companyId: companyObjectId,
            userId: userObjectId,
            action: 'PURCHASE_BILL_CONFIRMED',
            entity: 'PurchaseBill',
            entityId: bill._id,
            after: {
              billNumber,
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

  async convertFromOrder(
    companyId: string,
    userId: string,
    purchaseOrderId: string,
    billDate: string,
  ): Promise<PurchaseBillDocument> {
    const order = await this.purchaseOrderModel
      .findOne({
        _id: purchaseOrderId,
        companyId: new Types.ObjectId(companyId),
      })
      .exec();
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot bill a cancelled purchase order');
    }
    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Purchase order has already been billed');
    }

    const dto: CreatePurchaseBillDto = {
      supplierId: String(order.supplierId),
      billDate,
      purchaseOrderId: String(order._id),
      items: order.items.map((line) => ({
        itemId: String(line.itemId),
        quantity: line.quantity,
        rate: line.rate / 100,
        discountPercent: line.discountPercent,
      })),
    };

    return this.confirm(companyId, userId, dto);
  }

  findAll(companyId: string, query: PaginationQueryDto) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.search) {
      filter.$or = [
        { billNumber: { $regex: query.search, $options: 'i' } },
        { 'supplierSnapshot.name': { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.purchaseBillModel, filter, query, { billDate: -1 });
  }

  async findOne(companyId: string, id: string) {
    const bill = await this.purchaseBillModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!bill) throw new NotFoundException('Purchase bill not found');
    return bill;
  }

  /** Cancellation reverses stock and payable outstanding; never deletes the bill. */
  async cancel(
    companyId: string,
    userId: string,
    id: string,
    dto: CancelPurchaseBillDto,
  ): Promise<PurchaseBillDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const userObjectId = new Types.ObjectId(userId);

    const session = await this.connection.startSession();
    try {
      let updated!: PurchaseBillDocument;

      await session.withTransaction(async () => {
        const bill = await this.purchaseBillModel
          .findOne({ _id: id, companyId: companyObjectId })
          .session(session)
          .exec();
        if (!bill) throw new NotFoundException('Purchase bill not found');
        if (bill.status === PurchaseBillStatus.CANCELLED) {
          throw new BadRequestException('Bill is already cancelled');
        }

        for (const line of bill.items) {
          if (!line.itemId) continue;
          const item = await this.itemModel
            .findById(line.itemId)
            .session(session)
            .exec();
          if (!item || item.itemType !== ItemType.GOODS) continue;

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
                refDocType: 'PURCHASE_BILL_CANCELLATION',
                refDocId: bill._id,
                unitPrice: item.purchasePrice,
                userId: userObjectId,
              },
            ],
            { session },
          );
        }

        const outstandingReduction =
          bill.taxSummary.grandTotal - bill.amountPaid;
        await this.partyModel
          .updateOne(
            { _id: bill.supplierId },
            { $inc: { currentOutstanding: -outstandingReduction } },
          )
          .session(session)
          .exec();

        bill.status = PurchaseBillStatus.CANCELLED;
        bill.cancelledReason = dto.reason;
        bill.cancelledAt = new Date();
        await bill.save({ session });
        updated = bill;

        await this.auditService.record(
          {
            companyId: companyObjectId,
            userId: userObjectId,
            action: 'PURCHASE_BILL_CANCELLED',
            entity: 'PurchaseBill',
            entityId: bill._id,
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
