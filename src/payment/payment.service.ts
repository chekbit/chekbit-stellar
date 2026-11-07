import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import Decimal from 'decimal.js';
import { Repository } from 'typeorm';
import { WebhookJob, WebhookQueue } from '../queue/queue.constants';
import { WebhookType } from '../webhook/webhook.entity';
import { CreatePaymentInstructionDto } from './dto/create-payment-instruction.dto';
import { CreateWalletTopupInstructionDto } from './dto/create-wallet-topup-instruction.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { VerifyWalletTopupDto } from './dto/verify-wallet-topup.dto';
import {
  PaymentInstructionEntity,
  PaymentInstructionStatus,
  PaymentInstructionType,
} from './payment-instruction.entity';
import { PaymentEntity, PaymentType } from './payment.entity';

type IncomingPaymentInput = {
  memo: string;
  currency: string;
  amount: string | number;
  transactionHash: string;
  network?: string;
  publicAddress?: string;
  counterpartyAddress?: string;
};

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentInstructionEntity)
    private readonly instructionRepo: Repository<PaymentInstructionEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectQueue(WebhookQueue.name)
    private readonly webhookQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async createWalletTopupInstruction(dto: CreateWalletTopupInstructionDto) {
    const currency = String(dto.currency ?? 'USDC').trim().toUpperCase();
    const existingForCurrency = await this.instructionRepo.findOne({
      where: {
        userUuid: dto.user_uuid,
        type: PaymentInstructionType.WALLET_TOPUP,
        currency,
      },
      order: { createdAt: 'ASC' },
    });
    if (existingForCurrency) return this.formatInstruction(existingForCurrency);

    const existingForUser = await this.instructionRepo.findOne({
      where: { userUuid: dto.user_uuid, type: PaymentInstructionType.WALLET_TOPUP },
      order: { createdAt: 'ASC' },
    });
    if (existingForUser) {
      return this.saveInstruction({
        type: PaymentInstructionType.WALLET_TOPUP,
        userUuid: dto.user_uuid,
        currency,
        memo: existingForUser.memo,
        publicAddress: existingForUser.publicAddress,
        network: existingForUser.network,
      });
    }

    return this.saveInstruction({
      type: PaymentInstructionType.WALLET_TOPUP,
      userUuid: dto.user_uuid,
      currency,
    });
  }

  async createPaymentInstruction(dto: CreatePaymentInstructionDto) {
    const reference = String(dto.reference).trim();
    if (!reference) {
      throw new BadRequestException('reference is required');
    }
    const existing = await this.instructionRepo.findOne({ where: { reference } });
    if (existing) {
      if (
        existing.type !== PaymentInstructionType.PAYMENT_ORDER ||
        existing.userUuid !== dto.user_uuid
      ) {
        throw new BadRequestException(
          'reference is already associated with another payment instruction',
        );
      }
      return this.formatInstruction(existing);
    }

    return this.saveInstruction({
      type: PaymentInstructionType.PAYMENT_ORDER,
      userUuid: dto.user_uuid,
      reference,
      currency: dto.currency,
    });
  }

  private async saveInstruction(input: {
    type: PaymentInstructionType;
    userUuid: string;
    reference?: string;
    currency?: string;
    memo?: string;
    publicAddress?: string;
    network?: string;
  }) {
    const memo = input.memo ?? (await this.generateUniqueMemo());
    const publicAddress =
      input.publicAddress ?? this.configService.get<string>('STELLAR_PUBLIC_KEY');
    if (!publicAddress) {
      throw new BadRequestException('STELLAR_PUBLIC_KEY is not configured');
    }

    const instruction = await this.instructionRepo.save(
      this.instructionRepo.create({
        type: input.type,
        userUuid: input.userUuid,
        reference: input.reference ?? null,
        memo,
        publicAddress,
        currency: String(input.currency ?? 'USDC').toUpperCase(),
        network: input.network ?? 'stellar',
        status:
          input.type === PaymentInstructionType.WALLET_TOPUP
            ? null
            : PaymentInstructionStatus.PENDING,
      }),
    );

    return this.formatInstruction(instruction);
  }

  findByMemoOrReference(value: string, currency?: string) {
    const memoCondition = currency
      ? { memo: value, currency: currency.trim().toUpperCase() }
      : { memo: value };
    return this.instructionRepo.findOne({
      where: [memoCondition, { reference: value }],
    });
  }

  async applyIncomingPayment(
    instruction: PaymentInstructionEntity,
    input: IncomingPaymentInput,
  ): Promise<'paid' | 'mismatch'> {
    const memo = String(input.memo ?? '').trim();
    const currency = String(input.currency ?? '').trim().toUpperCase();
    const expectedCurrency = String(instruction.currency ?? '').trim().toUpperCase();

    if (
      (memo !== instruction.memo && memo !== instruction.reference) ||
      currency !== expectedCurrency
    ) {
      return 'mismatch';
    }

    const existingPayment = await this.paymentRepo.findOne({
      where: {
        instructionId: instruction.id,
        transactionHash: input.transactionHash,
      },
    });
    if (existingPayment) {
      return 'paid';
    }

    const amount = new Decimal(String(input.amount ?? '0'));
    if (!amount.isFinite() || amount.lte(0)) {
      return 'mismatch';
    }

    await this.paymentRepo.save(
      this.paymentRepo.create({
        instructionId: instruction.id,
        userUuid: instruction.userUuid,
        type:
          instruction.type === PaymentInstructionType.WALLET_TOPUP
            ? PaymentType.WALLET_TOPUP
            : PaymentType.PAYMENT_ORDER,
        transactionHash: input.transactionHash,
        amount: amount.toFixed(6),
        currency,
        network: input.network ?? instruction.network,
        publicAddress: input.publicAddress ?? instruction.publicAddress,
        counterpartyAddress: input.counterpartyAddress,
        memo,
      }),
    );

    let savedInstruction = instruction;
    if (instruction.type === PaymentInstructionType.PAYMENT_ORDER) {
      instruction.status = PaymentInstructionStatus.PAID;
      savedInstruction = await this.instructionRepo.save(instruction);
    }

    await this.dispatchReceivedWebhook(
      savedInstruction,
      input.transactionHash,
      memo,
      amount,
    );

    return 'paid';
  }

  async verifyPayment(reference: string, input?: VerifyPaymentDto) {
    const instruction = await this.instructionRepo.findOne({ where: { reference } });

    if (!instruction) {
      throw new BadRequestException('Payment instruction not found');
    }

    const incomingStatus = String(input?.status ?? '').toLowerCase();
    if (incomingStatus && !['paid', 'completed'].includes(incomingStatus)) {
      throw new BadRequestException('Webhook status is not paid/completed');
    }

    const incomingMemo = String(input?.memo ?? '').trim();
    if (
      incomingMemo &&
      incomingMemo !== instruction.memo &&
      incomingMemo !== instruction.reference
    ) {
      throw new BadRequestException('Webhook memo does not match payment instruction');
    }

    if (instruction.status !== PaymentInstructionStatus.PAID) {
      throw new BadRequestException(
        `Payment is not confirmed. Current status: ${instruction.status}`,
      );
    }

    const incomingHash = String(input?.transaction_hash ?? '').trim();
    let payments: PaymentEntity[];
    if (incomingHash) {
      const payment = await this.paymentRepo.findOne({
        where: { transactionHash: incomingHash, instructionId: instruction.id },
      });
      if (!payment) {
        throw new BadRequestException(
          'Transaction hash not found for payment instruction',
        );
      }
      payments = [payment];
    } else {
      payments = await this.paymentRepo.find({
        where: { instructionId: instruction.id },
        order: { createdAt: 'DESC' },
      });
    }

    return {
      message: 'Payment verified successfully',
      data: {
        is_valid: true,
        type: instruction.type,
        user_uuid: instruction.userUuid,
        reference: instruction.reference,
        memo: instruction.memo,
        ...(instruction.status ? { status: instruction.status } : {}),
        currency: instruction.currency,
        payments: payments.map((payment) => this.formatPayment(payment)),
      },
    };
  }

  async verifyWalletTopup(input: VerifyWalletTopupDto) {
    const transactionHash = String(input.transaction_hash ?? '').trim();
    if (!transactionHash) {
      throw new BadRequestException('transaction_hash is required');
    }

    const payment = await this.paymentRepo.findOne({
      where: { transactionHash },
      relations: { instruction: true },
    });
    if (
      !payment ||
      payment.instruction?.type !== PaymentInstructionType.WALLET_TOPUP
    ) {
      throw new BadRequestException('Wallet top-up transaction not found');
    }

    return {
      message: 'Wallet top-up verified successfully',
      data: {
        is_valid: true,
        user_uuid: payment.instruction.userUuid,
        payment: this.formatPayment(payment),
      },
    };
  }

  async getPaymentsByReference(reference: string) {
    const instruction = await this.instructionRepo.findOne({ where: { reference } });
    if (!instruction) {
      throw new BadRequestException('Payment instruction not found');
    }

    const payments = await this.paymentRepo.find({
      where: { instructionId: instruction.id },
      order: { createdAt: 'DESC' },
    });
    return {
      message: 'Payments retrieved successfully',
      data: {
        reference: instruction.reference,
        user_uuid: instruction.userUuid,
        payments: payments.map((payment) => this.formatPayment(payment)),
      },
    };
  }

  async getUserPaymentHistory(userUuid: string) {
    const payments = await this.paymentRepo.find({
      where: { userUuid },
      relations: { instruction: true },
      order: { createdAt: 'DESC' },
    });
    return {
      message: 'Payment history retrieved successfully',
      data: payments.map((payment) => ({
        ...this.formatPayment(payment),
        type: payment.type,
        reference: payment.instruction?.reference,
        user_uuid: payment.userUuid,
      })),
    };
  }

  private formatPayment(payment: PaymentEntity) {
    return {
      transaction_hash: payment.transactionHash,
      user_uuid: payment.userUuid,
      type: payment.type,
      amount: payment.amount,
      currency: payment.currency,
      network: payment.network,
      memo: payment.memo,
      public_address: payment.publicAddress,
      counterparty_address: payment.counterpartyAddress,
      status: payment.status,
      created_at: payment.createdAt,
    };
  }

  private formatInstruction(instruction: PaymentInstructionEntity) {
    return {
      message: 'Payment instruction ready',
      data: {
        type: instruction.type,
        user_uuid: instruction.userUuid,
        ...(instruction.reference
          ? { reference: instruction.reference }
          : {}),
        memo: instruction.memo,
        public_address: instruction.publicAddress,
        currency: instruction.currency,
        network: instruction.network,
        ...(instruction.type === PaymentInstructionType.PAYMENT_ORDER
          ? { status: instruction.status }
          : {}),
      },
    };
  }

  private async generateUniqueMemo(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const memo = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existing = await this.instructionRepo.findOne({
        where: { memo },
        select: ['id'],
      });
      if (!existing) return memo;
    }
    throw new BadRequestException('Unable to generate unique memo');
  }

  private async dispatchReceivedWebhook(
    instruction: PaymentInstructionEntity,
    transactionHash: string,
    memo: string,
    amount: Decimal,
  ) {
    const isWalletTopup = instruction.type === PaymentInstructionType.WALLET_TOPUP;
    const event = isWalletTopup ? 'wallet.topup.received' : 'payment.received';
    await this.webhookQueue.add(
      WebhookJob.send,
      {
        type: WebhookType.STELLAR,
        reference: instruction.reference,
        payload: {
          event,
          type: isWalletTopup ? PaymentType.WALLET_TOPUP : PaymentType.PAYMENT_ORDER,
          reference: instruction.reference,
          user_uuid: instruction.userUuid,
          transaction_hash: transactionHash,
          memo: memo || instruction.memo,
          public_address: instruction.publicAddress,
          asset_amount: amount.toFixed(6),
          asset_currency: instruction.currency,
          network: instruction.network,
          status: 'paid',
        },
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );
  }
}
