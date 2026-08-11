import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  entity?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export interface AuditLogListItem {
  _id: string;
  action: string;
  entity: string;
  entityId: string;
  userName?: string;
  ipAddress?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RecordAuditLogInput {
  companyId: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string;
  entity: string;
  entityId: Types.ObjectId;
  ipAddress?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async record(
    input: RecordAuditLogInput,
    session?: ClientSession,
  ): Promise<void> {
    await this.auditLogModel.create([input], { session });
  }

  /** Bounded read for exports/reporting; not for paginated UI listing. */
  async findForExport(
    companyId: string,
    range: { from?: Date; to?: Date },
  ): Promise<AuditLogDocument[]> {
    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (range.from || range.to) {
      const createdAt: Record<string, Date> = {};
      if (range.from) createdAt.$gte = range.from;
      if (range.to) createdAt.$lte = range.to;
      filter.createdAt = createdAt;
    }
    return this.auditLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .exec();
  }

  async findAll(
    companyId: string,
    query: AuditLogQuery,
  ): Promise<PaginatedResult<AuditLogListItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.entity) filter.entity = query.entity;
    if (query.action) filter.action = query.action;
    if (query.from || query.to) {
      const createdAt: Record<string, Date> = {};
      if (query.from) createdAt.$gte = query.from;
      if (query.to) createdAt.$lte = query.to;
      filter.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    const userIds = [
      ...new Set(
        logs.filter((log) => log.userId).map((log) => String(log.userId)),
      ),
    ];
    const users = userIds.length
      ? await this.userModel
          .find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
          .select('name')
          .exec()
      : [];
    const userNameById = new Map(
      users.map((user) => [String(user._id), user.name]),
    );

    const items: AuditLogListItem[] = logs.map((log) => ({
      _id: String(log._id),
      action: log.action,
      entity: log.entity,
      entityId: String(log.entityId),
      userName: log.userId ? userNameById.get(String(log.userId)) : undefined,
      ipAddress: log.ipAddress,
      before: log.before,
      after: log.after,
      metadata: log.metadata,
      createdAt: log.get('createdAt') as Date,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
