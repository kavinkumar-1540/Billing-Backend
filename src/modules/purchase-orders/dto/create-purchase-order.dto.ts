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

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsMongoId()
  supplierId!: string;

  @ApiProperty()
  @IsDateString()
  orderDate!: string;

  @ApiProperty({ type: [LineItemInputDto] })
  @ValidateNested({ each: true })
  @Type(() => LineItemInputDto)
  items!: LineItemInputDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;
}
