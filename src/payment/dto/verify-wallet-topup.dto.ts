import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyWalletTopupDto {
  @ApiProperty({ example: 'ABC123TXHASH' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  transaction_hash: string;
}
