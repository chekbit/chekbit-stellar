import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiPropertyOptional({ example: 'ABC123TXHASH' })
  @IsOptional()
  @IsString()
  transaction_hash?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ example: 'paid' })
  @IsOptional()
  @IsString()
  @IsIn(['paid', 'completed'])
  status?: string;
}
