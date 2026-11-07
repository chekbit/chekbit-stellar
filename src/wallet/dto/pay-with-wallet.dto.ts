import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class PayWithWalletDto {
  @ApiProperty({ description: 'Chekbit user ID (10–14 characters)', example: 'USR8K2M9QX' })
  @IsString()
  @Length(10, 14)
  @IsNotEmpty()
  user_uuid: string;

  @ApiProperty({ description: 'Reference associated with the payment' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ description: 'Amount to pay in the specified currency (e.g. 10.00)' })
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsNotEmpty()
  asset_amount: number;

  @ApiPropertyOptional({ description: 'Currency to pay with: USDC or XLM', default: 'USDC' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value ?? 'USDC').toUpperCase())
  currency?: string;

  @ApiPropertyOptional({ description: 'Fiat equivalent amount' })
  @IsOptional()
  fait_amount?: number;

  @ApiPropertyOptional({ description: 'Fiat currency code (e.g. USD, NGN)' })
  @IsOptional()
  @IsString()
  fait_currency?: string;
}
