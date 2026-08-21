import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PermissionModule,
  PermissionModuleDocument,
} from './schemas/module.schema';
import { SubModule, SubModuleDocument } from './schemas/sub-module.schema';
import { Api, ApiDocument } from './schemas/api.schema';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(PermissionModule.name)
    private readonly moduleModel: Model<PermissionModuleDocument>,
    @InjectModel(SubModule.name)
    private readonly subModuleModel: Model<SubModuleDocument>,
    @InjectModel(Api.name) private readonly apiModel: Model<ApiDocument>,
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  async findAllModules() {
    const [modules, subModules] = await Promise.all([
      this.moduleModel.find().sort({ order: 1 }).exec(),
      this.subModuleModel.find().exec(),
    ]);

    return modules.map((mod) => ({
      _id: mod._id,
      moduleName: mod.moduleName,
      path: mod.path,
      icon: mod.icon,
      order: mod.order,
      subModule: subModules
        .filter((sub) => String(sub.moduleId) === String(mod._id))
        .map((sub) => ({
          _id: sub._id,
          moduleId: sub.moduleId,
          subModuleName: sub.subModuleName,
          unique_key: sub.unique_key,
          parentSubModuleId: sub.parentSubModuleId,
        })),
    }));
  }

  async getRoleBasedPermissions(roleKey: string) {
    const [modules, permission] = await Promise.all([
      this.findAllModules(),
      this.permissionModel.findOne({ role_key: roleKey }).exec(),
    ]);

    const permissionIds = new Set(
      (permission?.permissionId ?? []).map((id) => String(id)),
    );

    const permissionsDetails = await this.subModuleModel
      .find({ _id: { $in: Array.from(permissionIds) } })
      .exec();

    return {
      modules,
      permissionsDetails: permissionsDetails.map((sub) => ({
        _id: sub._id,
        moduleId: sub.moduleId,
        subModuleName: sub.subModuleName,
        unique_key: sub.unique_key,
        parentSubModuleId: sub.parentSubModuleId,
      })),
    };
  }

  /** Never trusts client-supplied moduleId/apiId; derives them from permissionId. */
  async createPermissions(dtos: CreatePermissionDto[]) {
    for (const dto of dtos) {
      const subModuleIds = dto.permissionId.map((id) => new Types.ObjectId(id));

      const subModules = await this.subModuleModel
        .find({ _id: { $in: subModuleIds } })
        .exec();
      const moduleIds = Array.from(
        new Set(subModules.map((sub) => String(sub.moduleId))),
      ).map((id) => new Types.ObjectId(id));

      const apiIds = await this.apiModel.distinct('_id', {
        subModuleId: { $in: subModuleIds },
      });

      await this.permissionModel
        .updateOne(
          { role_key: dto.role_key },
          {
            $set: {
              role_key: dto.role_key,
              moduleId: moduleIds,
              permissionId: subModuleIds,
              apiId: apiIds,
            },
          },
          { upsert: true },
        )
        .exec();
    }
  }

  async getResolvedPermissionKeys(roleKey: string): Promise<string[]> {
    const permission = await this.permissionModel
      .findOne({ role_key: roleKey })
      .exec();
    if (!permission || permission.permissionId.length === 0) return [];

    const subModules = await this.subModuleModel
      .find({ _id: { $in: permission.permissionId } })
      .exec();
    return subModules.map((sub) => sub.unique_key);
  }

  async checkApiPermission(
    roleKey: string,
    routePattern: string,
    method: string,
  ): Promise<boolean> {
    const permission = await this.permissionModel
      .findOne({ role_key: roleKey })
      .exec();
    if (!permission || permission.apiId.length === 0) return false;

    const apiRecords = await this.apiModel
      .find({ _id: { $in: permission.apiId }, isActive: true, method })
      .exec();
    return apiRecords.some((api) => api.endpointPaths.includes(routePattern));
  }
}
