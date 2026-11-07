import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreatePaymentInstructionDto {
  @ApiProperty({ example: 'USR8K2M9QX' })
  @IsString()
  @Length(3, 14)
  user_uuid: string;

  @ApiProperty({ example: 'ORDER-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reference: string;

  @ApiPropertyOptional({ example: 'USDC', default: 'USDC' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }) => String(value ?? 'USDC').toUpperCase())
  currency?: string;
}
