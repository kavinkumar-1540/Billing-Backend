import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

/** Client submits quantity/rate/discount/taxRateId; backend recalculates all tax fields. */
export class LineItemInputDto {
  @ApiProperty()
  @IsMongoId()
  itemId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ description: 'rupees, per unit' })
  @IsNumber()
  @Min(0)
  rate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'rupees, flat' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class CreateDocumentWithLinesDto {
  @ApiProperty({ type: [LineItemInputDto] })
  @Type(() => LineItemInputDto)
  items!: LineItemInputDto[];
}
