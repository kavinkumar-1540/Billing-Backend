import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TaxRate, TaxRateDocument } from './schemas/tax-rate.schema';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';

@Injectable()
export class TaxesService {
  constructor(
    @InjectModel(TaxRate.name)
    private readonly taxRateModel: Model<TaxRateDocument>,
  ) {}

  create(companyId: string, dto: CreateTaxRateDto) {
    return this.taxRateModel.create({
      companyId: new Types.ObjectId(companyId),
      ...dto,
    });
  }

  findAll(companyId: string) {
    return this.taxRateModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .sort({ ratePercent: 1 })
      .exec();
  }

  async update(companyId: string, id: string, dto: UpdateTaxRateDto) {
    const taxRate = await this.taxRateModel
      .findOneAndUpdate(
        { _id: id, companyId: new Types.ObjectId(companyId) },
        dto,
        {
          new: true,
        },
      )
      .exec();
    if (!taxRate) throw new NotFoundException('Tax rate not found');
    return taxRate;
  }

  async deactivate(companyId: string, id: string) {
    const taxRate = await this.taxRateModel
      .findOneAndUpdate(
        { _id: id, companyId: new Types.ObjectId(companyId) },
        { isActive: false },
        { new: true },
      )
      .exec();
    if (!taxRate) throw new NotFoundException('Tax rate not found');
    return taxRate;
  }
}
