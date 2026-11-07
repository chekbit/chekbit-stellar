import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FundTestnetWalletByUserIdDto } from './dto/fund-testnet-wallet-by-user-id.dto';
import { EstimateSwapDto } from './dto/estimate-swap.dto';
import { StellarService } from './stellar.service';

@ApiTags('Stellar')
@Controller('stellar')
export class StellarController {
	constructor(private readonly stellarService: StellarService) {}

	@Post('wallet/generate')
	@ApiOperation({
		summary: 'Generate a new Stellar address pair',
		description:
			'Returns a new public address and secret key. Store the secret key securely; it cannot be recovered if lost.',
	})
	@ApiResponse({ status: 201, description: 'A new Stellar address pair was generated.' })
	generateWallet() {
		return {
			message: 'Stellar address pair generated successfully',
			data: this.stellarService.generateWallet(),
		};
	}

	@Post('wallet/generate-with-usdc-trustline')
	@ApiOperation({
		summary: 'Create a funded Stellar wallet with a USDC trustline',
		description:
			'Creates the account and USDC trustline in one transaction. The configured platform account funds the initial XLM balance.',
	})
	@ApiResponse({ status: 201, description: 'Wallet created and USDC trustline established.' })
	@ApiResponse({ status: 400, description: 'The initial XLM funding amount is invalid.' })
	@ApiResponse({ status: 502, description: 'The Stellar transaction could not be submitted.' })
	@ApiResponse({ status: 503, description: 'Wallet funding configuration is missing.' })
	generateWalletWithUsdcTrustline() {
		return this.stellarService.generateWalletWithUsdcTrustline();
	}

	@Get('rates/xlm-usdc')
	@ApiOperation({
		summary: 'Get the current XLM/USDC market rate',
		description: 'Returns the best Stellar order-book bid, ask, and their midpoint from public-network Horizon.',
	})
	@ApiResponse({ status: 200, description: 'XLM/USDC quotes retrieved successfully.' })
	@ApiResponse({ status: 502, description: 'The market quotes are unavailable.' })
	getXlmUsdcRate() {
		return this.stellarService.getXlmUsdcRate();
	}

	@Post('swap/xlm-to-usdc')
	@ApiOperation({
		summary: 'Swap platform XLM to USDC',
		description:
			'Executes a strict-send path payment from the configured platform account back to itself.',
	})
	@ApiBody({ type: EstimateSwapDto })
	@ApiResponse({ status: 201, description: 'XLM-to-USDC swap submitted.' })
	@ApiResponse({ status: 400, description: 'Invalid amount or slippage.' })
	@ApiResponse({ status: 502, description: 'No route or transaction submission failed.' })
	@ApiResponse({ status: 503, description: 'Platform signing configuration is missing or mismatched.' })
	swapXlmToUsdc(@Body() dto: EstimateSwapDto) {
		return this.stellarService.executePlatformSwap(
			'XLM',
			dto.amount,
			dto.slippagePercent,
		);
	}

	@Post('swap/usdc-to-xlm')
	@ApiOperation({
		summary: 'Swap platform USDC to XLM',
		description:
			'Executes a strict-send path payment from the configured platform account back to itself.',
	})
	@ApiBody({ type: EstimateSwapDto })
	@ApiResponse({ status: 201, description: 'USDC-to-XLM swap submitted.' })
	@ApiResponse({ status: 400, description: 'Invalid amount or slippage.' })
	@ApiResponse({ status: 502, description: 'No route or transaction submission failed.' })
	@ApiResponse({ status: 503, description: 'Platform signing configuration is missing or mismatched.' })
	swapUsdcToXlm(@Body() dto: EstimateSwapDto) {
		return this.stellarService.executePlatformSwap(
			'USDC',
		dto.amount,
		dto.slippagePercent,
		);
	}

	@Post('estimate/xlm-to-usdc')
	@ApiOperation({ summary: 'Estimate an XLM to USDC swap using Stellar strict-send paths.' })
	@ApiBody({ type: EstimateSwapDto })
	@ApiResponse({ status: 201, description: 'Swap estimate returned with quote, minimum output, and path.' })
	@ApiResponse({ status: 400, description: 'Invalid amount or slippage.' })
	@ApiResponse({ status: 502, description: 'No route or Horizon quotes are unavailable.' })
	estimateXlmToUsdc(@Body() dto: EstimateSwapDto) {
		return this.stellarService.estimateXlmToUsdc(dto.amount, dto.slippagePercent);
	}

	@Post('estimate/usdc-to-xlm')
	@ApiOperation({ summary: 'Estimate a USDC to XLM swap using Stellar strict-send paths.' })
	@ApiBody({ type: EstimateSwapDto })
	@ApiResponse({ status: 201, description: 'Swap estimate returned with quote, minimum output, and path.' })
	@ApiResponse({ status: 400, description: 'Invalid amount or slippage.' })
	@ApiResponse({ status: 502, description: 'No route or Horizon quotes are unavailable.' })
	estimateUsdcToXlm(@Body() dto: EstimateSwapDto) {
		return this.stellarService.estimateUsdcToXlm(dto.amount, dto.slippagePercent);
	}

	@Post('fund/testnet/user')
	@ApiOperation({
		summary: 'Fund a testnet wallet by user id',
		description:
			'Funds the user wallet on Stellar testnet. Uses Friendbot for XLM, and platform-funded transfer for USDC.',
	})
	@ApiBody({ type: FundTestnetWalletByUserIdDto })
	@ApiResponse({ status: 201, description: 'Testnet funding submitted successfully.' })
	@ApiResponse({ status: 400, description: 'Invalid asset or missing funding configuration.' })
	@ApiResponse({ status: 404, description: 'Wallet not found for user.' })
	fundTestnetWalletByUserId(@Body() dto: FundTestnetWalletByUserIdDto) {
		return this.stellarService.fundTestnetWalletByUserId(dto.user_id, {
			assetCode: dto.asset_code,
			amount: dto.amount,
		});
	}
}
