import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Party, PartyDocument, PartyType } from './schemas/party.schema';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { paginate } from '../../common/pagination.util';
import { rupeesToPaise } from '../../common/money/money.util';

@Injectable()
export class PartiesService {
  constructor(
    @InjectModel(Party.name) private readonly partyModel: Model<PartyDocument>,
  ) {}

  async create(companyId: string, dto: CreatePartyDto) {
    return this.partyModel.create({
      companyId: new Types.ObjectId(companyId),
      ...dto,
      creditLimit: dto.creditLimit != null ? rupeesToPaise(dto.creditLimit) : 0,
      openingBalance:
        dto.openingBalance != null ? rupeesToPaise(dto.openingBalance) : 0,
      currentOutstanding:
        dto.openingBalance != null ? rupeesToPaise(dto.openingBalance) : 0,
    });
  }

  async findAll(
    companyId: string,
    partyType: PartyType | undefined,
    query: PaginationQueryDto,
  ) {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (partyType) {
      filter.partyType =
        partyType === PartyType.BOTH
          ? partyType
          : { $in: [partyType, PartyType.BOTH] };
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { businessName: { $regex: query.search, $options: 'i' } },
        { gstin: { $regex: query.search, $options: 'i' } },
      ];
    }
    return paginate(this.partyModel, filter, query, { name: 1 });
  }

  async findOne(companyId: string, id: string) {
    const party = await this.partyModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  async update(companyId: string, id: string, dto: UpdatePartyDto) {
    const update: Record<string, unknown> = { ...dto };
    if (dto.creditLimit != null)
      update.creditLimit = rupeesToPaise(dto.creditLimit);
    if (dto.openingBalance != null)
      update.openingBalance = rupeesToPaise(dto.openingBalance);

    const party = await this.partyModel
      .findOneAndUpdate(
        { _id: id, companyId: new Types.ObjectId(companyId) },
        update,
        {
          new: true,
        },
      )
      .exec();
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  async deactivate(companyId: string, id: string) {
    const party = await this.partyModel
      .findOneAndUpdate(
        { _id: id, companyId: new Types.ObjectId(companyId) },
        { isActive: false },
        { new: true },
      )
      .exec();
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }
}
