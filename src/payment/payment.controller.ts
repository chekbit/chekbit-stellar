import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SystemOauth2Guard } from '../common/guard/systemOauth2.guard';
import { CreatePaymentInstructionDto } from './dto/create-payment-instruction.dto';
import { CreateWalletTopupInstructionDto } from './dto/create-wallet-topup-instruction.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { VerifyWalletTopupDto } from './dto/verify-wallet-topup.dto';
import { PaymentService } from './payment.service';

 @UseGuards(SystemOauth2Guard)
@Controller('payment-instructions')
@ApiTags('Payment Instructions')
@ApiBearerAuth('access-token')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('wallet-topups/stellar')
  @ApiOperation({
    summary: 'Create or retrieve a Stellar wallet top-up instruction',
    description:
      'Returns the existing top-up instruction for the user, or creates one if none exists. No amount is required.',
  })
  @ApiBody({ type: CreateWalletTopupInstructionDto })
  @ApiResponse({ status: 201, description: 'Wallet top-up instruction returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  createWalletTopupInstruction(@Body() dto: CreateWalletTopupInstructionDto) {
    return this.paymentService.createWalletTopupInstruction(dto);
  }

  @Post('stellar')
  @ApiOperation({
    summary: 'Create or retrieve a payment instruction by reference',
    description:
      'Creates a Stellar payment instruction for the required user and reference, or returns the existing instruction for that reference.',
  })
  @ApiBody({ type: CreatePaymentInstructionDto })
  @ApiResponse({ status: 201, description: 'Payment instruction returned.' })
  createPaymentInstruction(@Body() dto: CreatePaymentInstructionDto) {
    return this.paymentService.createPaymentInstruction(dto);
  }

  @Post('wallet-topups/verify-transaction')
  @ApiOperation({
    summary: 'Verify a wallet top-up by transaction hash',
    description: 'Finds a confirmed wallet top-up payment using its Stellar transaction hash.',
  })
  @ApiBody({ type: VerifyWalletTopupDto })
  @ApiResponse({ status: 200, description: 'Wallet top-up payment verified.' })
  @ApiResponse({ status: 400, description: 'Transaction hash is missing or not a wallet top-up.' })
  verifyWalletTopup(@Body() dto: VerifyWalletTopupDto) {
    return this.paymentService.verifyWalletTopup(dto);
  }

  @Get('users/:userUuid/history')
  @ApiOperation({
    summary: 'Retrieve payment history for a user',
    description: 'Returns payment records associated with all instructions belonging to the user UUID.',
  })
  @ApiResponse({ status: 200, description: 'User payment history returned.' })
  getUserPaymentHistory(@Param('userUuid') userUuid: string) {
    return this.paymentService.getUserPaymentHistory(userUuid);
  }

  @Get('stellar/:reference/payments')
  @ApiOperation({
    summary: 'Retrieve payments associated with a reference',
    description: 'Returns all confirmed payment records recorded for the specified instruction reference.',
  })
  @ApiResponse({ status: 200, description: 'Payments for the reference returned.' })
  getPaymentsByReference(@Param('reference') reference: string) {
    return this.paymentService.getPaymentsByReference(reference);
  }

  @Post('stellar/:reference/verify-transaction')
  @ApiOperation({
    summary: 'Verify a payment by reference',
    description:
      'Verifies that a confirmed Stellar payment exists for the payment instruction associated with the reference.',
  })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiResponse({ status: 200, description: 'Payment verified successfully.' })
  @ApiResponse({ status: 400, description: 'Instruction not found or payment not confirmed.' })
  verifyPayment(
    @Param('reference') reference: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentService.verifyPayment(reference, dto);
  }
}
