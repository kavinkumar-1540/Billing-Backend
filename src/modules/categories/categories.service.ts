import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  create(companyId: string, dto: CreateCategoryDto) {
    return this.categoryModel.create({
      companyId: new Types.ObjectId(companyId),
      name: dto.name,
      parentCategoryId: dto.parentCategoryId
        ? new Types.ObjectId(dto.parentCategoryId)
        : null,
    });
  }

  findAll(companyId: string) {
    return this.categoryModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ name: 1 })
      .exec();
  }

  async update(companyId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel
      .findOneAndUpdate(
        { _id: id, companyId: new Types.ObjectId(companyId) },
        {
          ...(dto.name != null ? { name: dto.name } : {}),
          ...(dto.parentCategoryId !== undefined
            ? {
                parentCategoryId: dto.parentCategoryId
                  ? new Types.ObjectId(dto.parentCategoryId)
                  : null,
              }
            : {}),
        },
        { new: true },
      )
      .exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(companyId: string, id: string) {
    const result = await this.categoryModel
      .deleteOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .exec();
    if (result.deletedCount === 0)
      throw new NotFoundException('Category not found');
  }
}
