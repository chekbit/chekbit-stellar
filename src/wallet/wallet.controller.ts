import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { PayWithWalletDto } from './dto/pay-with-wallet.dto';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create a user wallet',
    description:
      'Creates a Stellar wallet for a user, encrypts the secret key, and initializes dynamic wallet_balance records.',
  })
  @ApiBody({ type: CreateWalletDto })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid network supplied.',
  })
  @ApiResponse({
    status: 409,
    description: 'Wallet already exists for the user on the requested network.',
  })
  create(@Body() dto: CreateWalletDto) {
    return this.walletService.createUserWallet({
      userId: dto.user_id,
      network: dto.network,
    });
  }

  @Post(':walletId/sync-balance')
  @ApiOperation({
    summary: 'Sync wallet balances from chain',
    description:
      'Fetches current Stellar on-chain balances and upserts wallet_balance records for every currency.',
  })
  @ApiParam({
    name: 'walletId',
    description: 'Wallet ID to sync balances for.',
  })
  @ApiResponse({
    status: 201,
    description: 'Wallet balances synced successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet was not found.',
  })
  syncBalance(@Param('walletId') walletId: string) {
    return this.walletService.syncWalletBalances(walletId);
  }

  @Post('pay')
  @ApiOperation({
    summary: 'Submit a supplier-referenced Stellar payment using wallet balance',
    description:
      "Creates a payment instruction and submits an on-chain Stellar transfer from the user's wallet to the platform address with the instruction memo. Payment is recorded when blockchain confirmation is detected.",
  })
  @ApiBody({ type: PayWithWalletDto })
  @ApiResponse({ status: 201, description: 'Payment submitted. It will be recorded after on-chain confirmation.' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or on-chain transfer failed.' })
  @ApiResponse({ status: 404, description: 'Wallet not found for user.' })
  payWithWallet(@Body() dto: PayWithWalletDto) {
    return this.walletService.payWithWalletPayment({
      userUuid: dto.user_uuid,
      reference: dto.reference,
      asset_amount: dto.asset_amount,
      currency: dto.currency,
      fait_amount: dto.fait_amount,
      fait_currency: dto.fait_currency ?? '',
    });
  }

}