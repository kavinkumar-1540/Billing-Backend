import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsString,
  MinLength,
  Min,
} from 'class-validator';
import { BillAdjustmentType } from '../schemas/bill-adjustment.schema';

export class CreateBillAdjustmentDto {
  @ApiProperty()
  @IsMongoId()
  purchaseBillId!: string;

  @ApiProperty()
  @IsISO8601()
  date!: string;

  @ApiProperty({ enum: BillAdjustmentType })
  @IsEnum(BillAdjustmentType)
  adjustmentType!: BillAdjustmentType;

  @ApiProperty({ description: 'rupees, always positive' })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;
}
