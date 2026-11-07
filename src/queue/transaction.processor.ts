// src/queue/mail.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Horizon } from 'stellar-sdk';
import { PaymentService } from '../payment/payment.service';
import { StellarTransactionType } from '../stellar-transaction/stellar-transaction.entity';
import { StellarTransactionService } from '../stellar-transaction/stellar-transaction.service';
import { WalletService } from '../wallet/wallet.service';
import {
  IncomingTransactionJob,
  IncomingTransactionQueue,
} from './queue.constants';


@Injectable()
@Processor(IncomingTransactionQueue.name, {
  concurrency: Number(process.env.BULL_INCOMING_CONCURRENCY ?? 15),
  limiter: {
    max: Number(process.env.BULL_INCOMING_RATE_LIMIT_MAX ?? 120),
    duration: Number(process.env.BULL_INCOMING_RATE_LIMIT_DURATION_MS ?? 1000),
  },
})
export class TransactionProcessor extends WorkerHost {
  private readonly logger = new Logger(TransactionProcessor.name);
  private readonly server: Horizon.Server;
  private readonly platformPublic?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
    private readonly stellarTransactionService: StellarTransactionService,
    private readonly walletService: WalletService,
  ) {
    super();

    this.server = new Horizon.Server(
      this.configService.get<string>(
        'STELLAR_HORIZON_URL',
        'https://horizon-testnet.stellar.org',
      ),
    );

    this.platformPublic = this.configService.get<string>('STELLAR_PUBLIC_KEY');
  }

  async process(job: Job<any, any, string>) {
    if (job.name !== IncomingTransactionJob.stellarPaymentDetected) {
      this.logger.warn(`Skipping unsupported job name: ${job.name}`);
      return;
    }

    const {
      transactionHash,
      amount,
      from,
      to,
      network,
      rawPayload,
      assetType,
      assetCode,
    } = job.data;

    const currency = assetCode
      ? String(assetCode).toUpperCase()
      : assetType === 'native'
        ? 'XLM'
        : 'UNKNOWN';

    try {
      if (!from || !to || !transactionHash) {
        this.logger.warn('Skipping malformed payment job payload');
        return;
      }

      const trackedWallets = await this.walletService.findByPublicKeys([
        String(from),
        String(to),
      ]);

      const walletByAddress = new Map(
        trackedWallets.map((wallet) => [wallet.publicKey, wallet]),
      );

      const senderWallet = walletByAddress.get(String(from));
      const receiverWallet = walletByAddress.get(String(to));
      const isPlatformSender =
        !!this.platformPublic && String(from) === this.platformPublic;
      const isPlatformReceiver =
        !!this.platformPublic && String(to) === this.platformPublic;

      if (
        !senderWallet &&
        !receiverWallet &&
        !isPlatformSender &&
        !isPlatformReceiver
      ) {
        return;
      }

      const tx = await this.server
        .transactions()
        .transaction(String(transactionHash))
        .call();

      const memo = tx.memo ? String(tx.memo) : undefined;

      let matchedPaymentInstructionId: string | undefined;
      let matchedUserUuid: string | undefined;
      if (isPlatformReceiver && memo) {
        const instruction = await this.paymentService.findByMemoOrReference(
          memo,
          currency,
        );
        if (instruction) {
          matchedPaymentInstructionId = instruction.id;
          matchedUserUuid = instruction.userUuid;
          await this.paymentService.applyIncomingPayment(instruction, {
            memo,
            currency,
            amount,
            transactionHash: String(transactionHash),
            network,
            publicAddress: this.platformPublic,
            counterpartyAddress: String(from),
          });
        }
      }

      if (senderWallet) {
        await this.stellarTransactionService.recordConfirmedMovement({
          userUuid: senderWallet.userId,
          transactionHash: String(transactionHash),
          amount,
          type: StellarTransactionType.DEBIT,
          currency,
          network,
          publicAddress: senderWallet.publicKey,
          counterpartyAddress: String(to),
          memo,
          rawPayload,
        });

        await this.walletService.syncWalletBalancesByAddress(senderWallet.publicKey);
      }

      if (receiverWallet) {
        await this.stellarTransactionService.recordConfirmedMovement({
          userUuid: matchedUserUuid ?? receiverWallet.userId,
          paymentInstructionId:
            isPlatformReceiver && receiverWallet.publicKey === this.platformPublic
              ? matchedPaymentInstructionId
              : undefined,
          transactionHash: String(transactionHash),
          amount,
          type: StellarTransactionType.CREDIT,
          currency,
          network,
          publicAddress: receiverWallet.publicKey,
          counterpartyAddress: String(from),
          memo,
          rawPayload,
        });

        await this.walletService.syncWalletBalancesByAddress(
          receiverWallet.publicKey,
        );
      }

      if (isPlatformSender && !senderWallet && this.platformPublic) {
        await this.stellarTransactionService.recordConfirmedMovement({
          transactionHash: String(transactionHash),
          amount,
          type: StellarTransactionType.DEBIT,
          currency,
          network,
          publicAddress: this.platformPublic,
          counterpartyAddress: String(to),
          memo,
          rawPayload,
        });
      }

      if (isPlatformReceiver && !receiverWallet && this.platformPublic) {
        await this.stellarTransactionService.recordConfirmedMovement({
          userUuid: matchedUserUuid,
          paymentInstructionId: matchedPaymentInstructionId,
          transactionHash: String(transactionHash),
          amount,
          type: StellarTransactionType.CREDIT,
          currency,
          network,
          publicAddress: this.platformPublic,
          counterpartyAddress: String(from),
          memo,
          rawPayload,
        });
      }

      this.logger.log(`Processed queued stellar payment ${transactionHash}`);

      return;

    } catch (error) {
      this.logger.error(`Failed to process incoming stellar transaction`, error);
      throw error;
    }
  }
}
