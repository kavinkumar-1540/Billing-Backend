import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  PurchaseOrder,
  PurchaseOrderDocument,
  PurchaseOrderStatus,
} from './schemas/purchase-order.schema';
import { Party, PartyDocument } from '../parties/schemas/party.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { DocumentLineBuilderService } from '../taxes/document-line-builder.service';
import { DocumentSequenceService } from '../document-sequences/document-sequence.service';
import { DocumentType } from '../document-sequences/schemas/document-sequence.schema';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(Party.name) private readonly partyModel: Model<PartyDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    private readonly lineBuilder: DocumentLineBuilderService,
    private readonly sequenceService: DocumentSequenceService,
  ) {}

  async create(
    companyId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderDocument> {
    const companyObjectId = new Types.ObjectId(companyId);

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

    const { embeddedItems, taxSummary } = await this.lineBuilder.build(
      companyObjectId,
      dto.items,
      company.address?.stateCode ?? '',
      supplier.stateCode,
    );

    const session = await this.connection.startSession();
    try {
      let created!: PurchaseOrderDocument;
      await session.withTransaction(async () => {
        const financialYear = this.sequenceService.resolveFinancialYear(
          new Date(dto.orderDate),
          company.financialYearStartMonth,
        );
        const poNumber = await this.sequenceService.getNextNumber(
          companyObjectId,
          DocumentType.PURCHASE_ORDER,
          financialYear,
          session,
        );

        const [doc] = await this.purchaseOrderModel.create(
          [
            {
              companyId: companyObjectId,
              poNumber,
              orderDate: new Date(dto.orderDate),
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
              items: embeddedItems,
              taxSummary,
              notes: dto.notes,
              terms: dto.terms,
              expectedDeliveryDate: dto.expectedDeliveryDate
                ? new Date(dto.expectedDeliveryDate)
                : undefined,
              status: PurchaseOrderStatus.CONFIRMED,
            },
          ],
          { session },
        );
        created = doc;
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
        { poNumber: { $regex: query.search, $options: 'i' } },
        { 'supplierSnapshot.name': { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.purchaseOrderModel, filter, query, { orderDate: -1 });
  }

  async findOne(companyId: string, id: string) {
    const order = await this.purchaseOrderModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async cancel(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);
    if (
      order.status === PurchaseOrderStatus.RECEIVED ||
      order.status === PurchaseOrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot cancel an order that has already been received',
      );
    }
    order.status = PurchaseOrderStatus.CANCELLED;
    await order.save();
    return order;
  }
}
