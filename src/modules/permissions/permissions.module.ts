import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import {
  PermissionModule,
  PermissionModuleSchema,
} from './schemas/module.schema';
import { SubModule, SubModuleSchema } from './schemas/sub-module.schema';
import { Api, ApiSchema } from './schemas/api.schema';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PermissionModule.name, schema: PermissionModuleSchema },
      { name: SubModule.name, schema: SubModuleSchema },
      { name: Api.name, schema: ApiSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
