import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { StockDirection } from '../schemas/stock-movement.schema';

export class CreateStockAdjustmentDto {
  @ApiProperty()
  @IsMongoId()
  itemId!: string;

  @ApiProperty({ enum: StockDirection })
  @IsEnum(StockDirection)
  direction!: StockDirection;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Reason for the manual stock adjustment (required for audit)',
  })
  @IsString()
  @MinLength(3)
  reason!: string;
}
