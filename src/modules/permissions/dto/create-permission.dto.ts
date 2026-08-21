import { IsArray, IsMongoId, IsString } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  role_key!: string;

  @IsArray()
  @IsMongoId({ each: true })
  permissionId!: string[];
}
