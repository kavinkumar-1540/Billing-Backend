import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import {
  StockMovement,
  StockMovementDocument,
  StockDirection,
  StockMovementType,
} from './schemas/stock-movement.schema';
import { Item, ItemDocument } from '../items/schemas/item.schema';
import {
  CompanySettings,
  CompanySettingsDocument,
} from '../settings/schemas/company-settings.schema';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class StockMovementsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
    @InjectModel(CompanySettings.name)
    private readonly companySettingsModel: Model<CompanySettingsDocument>,
    private readonly auditService: AuditService,
  ) {}

  findMovements(
    companyId: string,
    itemId: string | undefined,
    query: PaginationQueryDto,
  ) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (itemId) filter.itemId = new Types.ObjectId(itemId);
    return paginate(this.stockMovementModel, filter, query, { createdAt: -1 });
  }

  findStockLevels(companyId: string, query: PaginationQueryDto) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
      isActive: true,
      itemType: 'GOODS',
    };
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { sku: { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.itemModel, filter, query, { name: 1 });
  }

  async createAdjustment(
    companyId: string,
    userId: string,
    dto: CreateStockAdjustmentDto,
  ): Promise<StockMovementDocument> {
    const companyObjectId = new Types.ObjectId(companyId);
    const itemObjectId = new Types.ObjectId(dto.itemId);

    const session = await this.connection.startSession();
    try {
      let movement!: StockMovementDocument;

      await session.withTransaction(async () => {
        const item = await this.itemModel
          .findOne({ _id: itemObjectId, companyId: companyObjectId })
          .session(session)
          .exec();
        if (!item) throw new NotFoundException('Item not found');

        const settings = await this.companySettingsModel
          .findOne({ companyId: companyObjectId })
          .session(session)
          .exec();

        const delta =
          dto.direction === StockDirection.IN ? dto.quantity : -dto.quantity;
        const resultingStock = item.currentStock + delta;

        if (resultingStock < 0 && !settings?.allowNegativeStock) {
          throw new BadRequestException(
            `Adjustment would result in negative stock (${resultingStock}) for "${item.name}"`,
          );
        }

        const before = { currentStock: item.currentStock };

        await this.itemModel
          .updateOne({ _id: itemObjectId }, { $inc: { currentStock: delta } })
          .session(session)
          .exec();

        const [createdMovement] = await this.stockMovementModel.create(
          [
            {
              companyId: companyObjectId,
              itemId: itemObjectId,
              quantity: dto.quantity,
              direction: dto.direction,
              movementType: StockMovementType.ADJUSTMENT,
              userId: new Types.ObjectId(userId),
            },
          ],
          { session },
        );
        movement = createdMovement;

        await this.auditService.record(
          {
            companyId: companyObjectId,
            userId: new Types.ObjectId(userId),
            action: 'STOCK_ADJUSTMENT',
            entity: 'Item',
            entityId: itemObjectId,
            before,
            after: { currentStock: resultingStock },
            metadata: { reason: dto.reason, movementId: createdMovement._id },
          },
          session,
        );
      });

      return movement;
    } finally {
      await session.endSession();
    }
  }
}
