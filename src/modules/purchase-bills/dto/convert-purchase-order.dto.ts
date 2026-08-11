import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ConvertPurchaseOrderDto {
  @ApiProperty()
  @IsDateString()
  billDate!: string;
}
