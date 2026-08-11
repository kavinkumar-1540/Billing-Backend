import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
  MinLength,
} from 'class-validator';
import { PERMISSIONS } from '../../permissions/permissions.constants';

const VALID_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: VALID_PERMISSION_KEYS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsIn(VALID_PERMISSION_KEYS, { each: true })
  permissions!: string[];
}
