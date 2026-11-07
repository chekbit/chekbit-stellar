import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class FundTestnetWalletByUserIdDto {
  @ApiProperty({ example: 'user_12345' })
  @IsString()
  user_id: string;

  @ApiPropertyOptional({ example: 'USDC', enum: ['USDC', 'XLM'], default: 'USDC' })
  @IsOptional()
  @IsString()
  @IsIn(['USDC', 'XLM'])
  asset_code?: 'USDC' | 'XLM';

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  amount?: string;
}
