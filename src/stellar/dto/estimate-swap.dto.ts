import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class EstimateSwapDto {
	@ApiProperty({ example: 1000, description: 'Amount of the input asset to swap.' })
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 7 })
	@Min(0.0000001)
	amount: number;

	@ApiPropertyOptional({ example: 1, default: 1, description: 'Allowed slippage percentage.' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({ maxDecimalPlaces: 4 })
	@Min(0)
	@Max(99.99)
	slippagePercent = 1;
}