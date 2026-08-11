import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCompanyUserStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
