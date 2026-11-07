import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StellarTransactionEntity,
  StellarTransactionStatus,
  StellarTransactionType,
} from './stellar-transaction.entity';

type IncomingTransactionPayload = {
  userUuid?: string;
  paymentInstructionId?: string;
  transactionHash: string;
  amount: string | number;
  type?: StellarTransactionType;
  currency?: string;
  network?: string;
  publicAddress?: string;
  counterpartyAddress?: string;
  memo?: string;
  rawPayload?: Record<string, unknown>;
};

@Injectable()
export class StellarTransactionService {
  constructor(
    @InjectRepository(StellarTransactionEntity)
    private readonly stellarTransactionRepo: Repository<StellarTransactionEntity>,
  ) {}

  findByHash(transactionHash: string) {
    return this.stellarTransactionRepo.findOne({
      where: { transactionHash },
    });
  }

  findMovement(
    transactionHash: string,
    publicAddress: string,
    type: StellarTransactionType,
  ) {
    return this.stellarTransactionRepo.findOne({
      where: {
        transactionHash,
        publicAddress,
        type,
      },
    });
  }

  createConfirmedTransaction(payload: IncomingTransactionPayload) {
    const transaction = this.stellarTransactionRepo.create({
      userUuid: payload.userUuid,
      paymentInstructionId: payload.paymentInstructionId,
      transactionHash: payload.transactionHash,
      amount: String(payload.amount ?? '0'),
      type: payload.type ?? StellarTransactionType.CREDIT,
      currency: payload.currency ?? 'XLM',
      status: StellarTransactionStatus.CONFIRMED,
      network: payload.network,
      publicAddress: payload.publicAddress,
      counterpartyAddress: payload.counterpartyAddress,
      memo: payload.memo,
      rawPayload: payload.rawPayload,
    });

    return this.stellarTransactionRepo.save(transaction);
  }

  async recordConfirmedMovement(payload: IncomingTransactionPayload) {
    const publicAddress = payload.publicAddress;
    const type = payload.type ?? StellarTransactionType.CREDIT;

    if (!publicAddress) {
      return this.createConfirmedTransaction(payload);
    }

    const existing = await this.findMovement(
      payload.transactionHash,
      publicAddress,
      type,
    );

    if (!existing) {
      return this.createConfirmedTransaction(payload);
    }

    existing.userUuid = payload.userUuid;
    existing.paymentInstructionId = payload.paymentInstructionId;
    existing.amount = String(payload.amount ?? existing.amount);
    existing.currency = payload.currency ?? existing.currency;
    existing.status = StellarTransactionStatus.CONFIRMED;
    existing.network = payload.network;
    existing.counterpartyAddress = payload.counterpartyAddress;
    existing.memo = payload.memo;
    existing.rawPayload = payload.rawPayload;

    return this.stellarTransactionRepo.save(existing);
  }
}
