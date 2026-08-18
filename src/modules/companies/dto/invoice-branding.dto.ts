import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class InvoiceBrandingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() invoicePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultPaymentTermDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}
