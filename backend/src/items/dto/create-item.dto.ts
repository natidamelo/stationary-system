import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsMongoId,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({ default: 'unit' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderLevel?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ default: 0, description: 'Cost per unit for COGS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;
}
