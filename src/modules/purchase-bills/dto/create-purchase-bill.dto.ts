import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LineItemInputDto } from '../../../common/dto/line-item-input.dto';

export class CreatePurchaseBillDto {
  @ApiProperty()
  @IsMongoId()
  supplierId!: string;

  @ApiProperty()
  @IsDateString()
  billDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierInvoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  purchaseOrderId?: string;

  @ApiProperty({ type: [LineItemInputDto] })
  @ValidateNested({ each: true })
  @Type(() => LineItemInputDto)
  items!: LineItemInputDto[];
}
