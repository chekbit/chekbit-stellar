import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({
    example: 'user_12345',
    description: 'Internal user identifier that will own the wallet.',
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    example: 'stellar',
    description: 'Blockchain network for wallet creation. Currently only stellar is supported.',
  })
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsString()
  @IsNotEmpty()
  network: string;
}