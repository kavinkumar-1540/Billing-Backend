import { Model } from 'mongoose';
import {
  PaginatedResult,
  PaginationQueryDto,
} from './dto/pagination-query.dto';

export async function paginate<T>(
  model: Model<T>,
  filter: Record<string, unknown>,
  query: PaginationQueryDto,
  sort: Record<string, 1 | -1> = { createdAt: -1 },
): Promise<PaginatedResult<T>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
    model.countDocuments(filter).exec(),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
