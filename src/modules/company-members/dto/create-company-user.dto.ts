import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateCompanyUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Temporary password set by the admin' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsMongoId()
  roleId!: string;

  @ApiPropertyOptional({
    description: 'Initial membership status; defaults to active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
