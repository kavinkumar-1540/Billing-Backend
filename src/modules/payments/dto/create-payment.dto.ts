import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, PaymentType } from '../schemas/payment.schema';
import { AllocationRefType } from '../../payment-allocations/schemas/payment-allocation.schema';

export class PaymentAllocationInputDto {
  @ApiProperty({ enum: AllocationRefType })
  @IsEnum(AllocationRefType)
  refDocType!: AllocationRefType;

  @ApiProperty()
  @IsMongoId()
  refDocId!: string;

  @ApiProperty({ description: 'rupees' })
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  paymentType!: PaymentType;

  @ApiProperty()
  @IsMongoId()
  partyId!: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'rupees' })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [PaymentAllocationInputDto] })
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationInputDto)
  allocations!: PaymentAllocationInputDto[];
}
