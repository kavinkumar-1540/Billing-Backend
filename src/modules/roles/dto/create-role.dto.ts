import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  roleKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
