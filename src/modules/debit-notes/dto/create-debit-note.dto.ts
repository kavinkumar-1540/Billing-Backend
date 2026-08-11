import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LineItemInputDto } from '../../../common/dto/line-item-input.dto';

export class CreateDebitNoteDto {
  @ApiProperty()
  @IsMongoId()
  originalBillId!: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiProperty({ type: [LineItemInputDto] })
  @ValidateNested({ each: true })
  @Type(() => LineItemInputDto)
  items!: LineItemInputDto[];
}
