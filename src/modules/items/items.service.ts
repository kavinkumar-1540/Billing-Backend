import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Item, ItemDocument } from './schemas/item.schema';
import {
  StockMovement,
  StockMovementDocument,
  StockDirection,
  StockMovementType,
} from '../stock-movements/schemas/stock-movement.schema';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';
import { rupeesToPaise } from '../../common/money/money.util';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
  ) {}

  async create(companyId: string, userId: string, dto: CreateItemDto) {
    const openingStock = dto.openingStock ?? 0;

    const item = await this.itemModel.create({
      companyId: new Types.ObjectId(companyId),
      ...dto,
      categoryId: dto.categoryId
        ? new Types.ObjectId(dto.categoryId)
        : undefined,
      taxRateId: dto.taxRateId ? new Types.ObjectId(dto.taxRateId) : undefined,
      purchasePrice:
        dto.purchasePrice != null ? rupeesToPaise(dto.purchasePrice) : 0,
      sellingPrice:
        dto.sellingPrice != null ? rupeesToPaise(dto.sellingPrice) : 0,
      openingStock,
      currentStock: openingStock,
    });

    if (openingStock > 0) {
      await this.stockMovementModel.create({
        companyId: new Types.ObjectId(companyId),
        itemId: item._id,
        quantity: openingStock,
        direction: StockDirection.IN,
        movementType: StockMovementType.OPENING,
        unitPrice: item.purchasePrice,
        userId: new Types.ObjectId(userId),
      });
    }

    return item;
  }

  findAll(companyId: string, query: PaginationQueryDto) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
      isActive: true,
    };
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { sku: { $regex: query.search, $options: 'i' } },
        { barcode: { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.itemModel, filter, query, { name: 1 });
  }

  async findOne(companyId: string, id: string) {
    const item = await this.itemModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async update(companyId: string, id: string, dto: UpdateItemDto) {
    const update: Record<string, unknown> = { ...dto };
    if (dto.categoryId) update.categoryId = new Types.ObjectId(dto.categoryId);
    if (dto.taxRateId) update.taxRateId = new Types.ObjectId(dto.taxRateId);
    if (dto.purchasePrice != null)
      update.purchasePrice = rupeesToPaise(dto.purchasePrice);
    if (dto.sellingPrice != null)
      update.sellingPrice = rupeesToPaise(dto.sellingPrice);
    delete update.openingStock; // opening stock is a one-time value set at creation only

    const item = await this.itemModel
      .findOneAndUpdate(
        { _id: id, companyId: new Types.ObjectId(companyId) },
        update,
        {
          new: true,
        },
      )
      .exec();
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async deactivate(companyId: string, id: string) {
    const item = await this.itemModel
      .findOneAndUpdate(
        { _id: id, companyId: new Types.ObjectId(companyId) },
        { isActive: false },
        { new: true },
      )
      .exec();
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }
}
