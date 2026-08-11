import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class UpdateCompanyUserRoleDto {
  @ApiProperty()
  @IsMongoId()
  roleId!: string;
}
