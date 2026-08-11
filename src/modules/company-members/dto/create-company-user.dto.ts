import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsString, MinLength } from 'class-validator';

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
}
