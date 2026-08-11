import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ItemType } from '../schemas/item.schema';

export class CreateItemDto {
  @ApiProperty()
  @IsString()
  sku!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hsnSac?: string;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ enum: ItemType, default: ItemType.GOODS })
  @IsOptional()
  @IsEnum(ItemType)
  itemType?: ItemType;

  @ApiPropertyOptional({ description: 'rupees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'rupees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsMongoId() taxRateId?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) openingStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) maxStock?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batchNumber?: string;
}
