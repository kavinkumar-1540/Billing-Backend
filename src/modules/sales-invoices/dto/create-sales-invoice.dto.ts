import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { LineItemInputDto } from '../../../common/dto/line-item-input.dto';
import { PaymentMethod } from '../schemas/sales-invoice.schema';

export class CreateSalesInvoiceDto {
  @ApiProperty()
  @IsMongoId()
  customerId!: string;

  @ApiProperty()
  @IsDateString()
  invoiceDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  salesOrderId?: string;

  @ApiProperty({ type: [LineItemInputDto] })
  @ValidateNested({ each: true })
  @Type(() => LineItemInputDto)
  items!: LineItemInputDto[];

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
