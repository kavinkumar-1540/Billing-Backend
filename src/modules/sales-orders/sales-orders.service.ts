import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  SalesOrder,
  SalesOrderDocument,
  SalesOrderStatus,
} from './schemas/sales-order.schema';
import { Party, PartyDocument } from '../parties/schemas/party.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { DocumentLineBuilderService } from '../taxes/document-line-builder.service';
import { DocumentSequenceService } from '../document-sequences/document-sequence.service';
import { DocumentType } from '../document-sequences/schemas/document-sequence.schema';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';

@Injectable()
export class SalesOrdersService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(SalesOrder.name)
    private readonly salesOrderModel: Model<SalesOrderDocument>,
    @InjectModel(Party.name) private readonly partyModel: Model<PartyDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    private readonly lineBuilder: DocumentLineBuilderService,
    private readonly sequenceService: DocumentSequenceService,
  ) {}

  async create(
    companyId: string,
    dto: CreateSalesOrderDto,
  ): Promise<SalesOrderDocument> {
    const companyObjectId = new Types.ObjectId(companyId);

    const [company, customer] = await Promise.all([
      this.companyModel.findById(companyObjectId).exec(),
      this.partyModel
        .findOne({ _id: dto.customerId, companyId: companyObjectId })
        .exec(),
    ]);
    if (!company) throw new NotFoundException('Company not found');
    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.stateCode) {
      throw new BadRequestException(
        'Customer must have a state/place of supply configured',
      );
    }

    const { embeddedItems, taxSummary } = await this.lineBuilder.build(
      companyObjectId,
      dto.items,
      company.address?.stateCode ?? '',
      customer.stateCode,
    );

    const session = await this.connection.startSession();
    try {
      let created!: SalesOrderDocument;
      await session.withTransaction(async () => {
        const financialYear = this.sequenceService.resolveFinancialYear(
          new Date(dto.orderDate),
          company.financialYearStartMonth,
        );
        const orderNumber = await this.sequenceService.getNextNumber(
          companyObjectId,
          DocumentType.SALES_ORDER,
          financialYear,
          session,
        );

        const [doc] = await this.salesOrderModel.create(
          [
            {
              companyId: companyObjectId,
              orderNumber,
              orderDate: new Date(dto.orderDate),
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
              billingAddress: dto.billingAddress ?? customer.billingAddress,
              shippingAddress: dto.shippingAddress ?? customer.shippingAddress,
              items: embeddedItems,
              taxSummary,
              notes: dto.notes,
              terms: dto.terms,
              expectedDeliveryDate: dto.expectedDeliveryDate
                ? new Date(dto.expectedDeliveryDate)
                : undefined,
              status: SalesOrderStatus.CONFIRMED,
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
        { orderNumber: { $regex: query.search, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.salesOrderModel, filter, query, { orderDate: -1 });
  }

  async findOne(companyId: string, id: string) {
    const order = await this.salesOrderModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  async cancel(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);
    if (
      order.status === SalesOrderStatus.INVOICED ||
      order.status === SalesOrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot cancel an order that has already been invoiced',
      );
    }
    order.status = SalesOrderStatus.CANCELLED;
    await order.save();
    return order;
  }
}
