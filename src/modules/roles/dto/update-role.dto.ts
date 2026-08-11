import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PERMISSIONS } from '../../permissions/permissions.constants';

const VALID_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: VALID_PERMISSION_KEYS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(VALID_PERMISSION_KEYS, { each: true })
  permissions?: string[];
}
