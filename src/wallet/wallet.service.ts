import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { StellarService } from '../stellar/stellar.service';
import { PaymentService } from '../payment/payment.service';
import { WalletEntity, WalletType } from './wallet.entity';
import { WalletBalanceEntity } from './wallet-balance.entity';

type PersistWalletPayload = {
  userId: string;
  publicKey: string;
  secretKey: string;
  network?: string;
  type?: WalletType;
};

type CreateUserWalletPayload = {
  userId: string;
  network: string;
};

type PayWithWalletPaymentInput = {
  userUuid: string;
  reference: string;
  asset_amount: number;
  currency?: string;
  fait_amount?: number;
  fait_currency?: string;
};

@Injectable()
export class WalletService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly stellarService: StellarService,
    private readonly paymentService: PaymentService,
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    @InjectRepository(WalletBalanceEntity)
    private readonly walletBalanceRepo: Repository<WalletBalanceEntity>,
  ) {}

  createWallet(payload: PersistWalletPayload) {
    const wallet = this.walletRepo.create({
      userId: payload.userId,
      publicKey: payload.publicKey,
      secretKey: payload.secretKey,
      network: payload.network ?? 'stellar',
      type: payload.type ?? WalletType.USER,
    });

    return this.walletRepo.save(wallet);
  }

  async createUserWallet(payload: CreateUserWalletPayload) {
    const network = String(payload.network ?? '').trim().toLowerCase();
    if (network !== 'stellar') {
      throw new BadRequestException('invalid network');
    }

    const existingWallet = await this.walletRepo.findOne({
      where: {
        userId: payload.userId,
        network,
      },
    });

    if (existingWallet) {
      throw new ConflictException(
        `wallet already exists for user ${payload.userId} on ${network}`,
      );
    }

    const generatedWallet = this.stellarService.generateWallet();
    const encryptedSecret = this.encryptSecretKey(generatedWallet.secret);
    const chainBalances = await this.stellarService.getWalletBalances(
      generatedWallet.publicKey,
    );
    const initialBalances = {
      XLM: chainBalances.XLM ?? '0',
      USDC: chainBalances.USDC ?? '0',
    };

    return this.dataSource.transaction(async (manager) => {
      const wallet = manager.create(WalletEntity, {
        userId: payload.userId,
        publicKey: generatedWallet.publicKey,
        secretKey: encryptedSecret,
        network,
        type: WalletType.USER,
        lastBalanceSyncAt: new Date(),
      });

      const savedWallet = await manager.save(wallet);

      const balances = Object.entries(initialBalances).map(([currency, balance]) =>
        manager.create(WalletBalanceEntity, {
          walletId: savedWallet.id,
          currency,
          balance,
        }),
      );

      await manager.save(WalletBalanceEntity, balances);

      return {
        message: 'Wallet created successfully',
        data: {
          id: savedWallet.id,
          user_id: savedWallet.userId,
          public_key: savedWallet.publicKey,
          network: savedWallet.network,
          type: savedWallet.type,
          balances: initialBalances,
          last_balance_sync_at: savedWallet.lastBalanceSyncAt,
        },
      };
    });
  }

  async syncWalletBalances(walletId: string) {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId } });

    if (!wallet) {
      throw new NotFoundException('wallet not found');
    }

    if (wallet.network !== 'stellar') {
      throw new BadRequestException(
        `balance sync is not supported for ${wallet.network}`,
      );
    }

    const balanceMap = await this.applyChainBalancesToWallet(wallet);

    return {
      message: 'Wallet balances updated successfully',
      data: {
        id: wallet.id,
        user_id: wallet.userId,
        public_key: wallet.publicKey,
        network: wallet.network,
        balances: balanceMap,
        last_balance_sync_at: wallet.lastBalanceSyncAt,
      },
    };
  }

  findByUserId(userId: string) {
    return this.walletRepo.findOne({
      where: { userId },
      relations: ['balances'],
    });
  }

  findByPublicKey(publicKey: string) {
    return this.walletRepo.findOne({
      where: { publicKey },
    });
  }

  findByPublicKeys(publicKeys: string[]) {
    const uniqueKeys = Array.from(new Set(publicKeys.map((key) => String(key))));

    if (uniqueKeys.length === 0) {
      return Promise.resolve([]);
    }

    return this.walletRepo.find({
      where: {
        publicKey: In(uniqueKeys),
      },
    });
  }

  async syncWalletBalancesByAddress(publicKey: string) {
    const wallet = await this.walletRepo.findOne({
      where: { publicKey },
    });

    if (!wallet) {
      throw new NotFoundException('wallet not found');
    }

    const balanceMap = await this.applyChainBalancesToWallet(wallet);

    return {
      message: 'Wallet balances updated successfully',
      data: {
        id: wallet.id,
        user_id: wallet.userId,
        public_key: wallet.publicKey,
        network: wallet.network,
        balances: balanceMap,
        last_balance_sync_at: wallet.lastBalanceSyncAt,
      },
    };
  }

  private async applyChainBalancesToWallet(
    wallet: WalletEntity,
  ): Promise<Record<string, string>> {
    const balances = await this.stellarService.getWalletBalances(wallet.publicKey);

    await this.dataSource.transaction(async (manager) => {
      const existingBalances = await manager.find(WalletBalanceEntity, {
        where: { walletId: wallet.id },
      });

      const existingByCurrency = new Map(
        existingBalances.map((balance) => [balance.currency.toUpperCase(), balance]),
      );

      const toSave: WalletBalanceEntity[] = [];

      for (const [currency, amount] of Object.entries(balances)) {
        const code = currency.toUpperCase();
        const current = existingByCurrency.get(code);

        if (current) {
          current.balance = String(amount);
          toSave.push(current);
          continue;
        }

        toSave.push(
          manager.create(WalletBalanceEntity, {
            walletId: wallet.id,
            currency: code,
            balance: String(amount),
          }),
        );
      }

      if (toSave.length > 0) {
        await manager.save(WalletBalanceEntity, toSave);
      }
    });

    wallet.lastBalanceSyncAt = new Date();
    await this.walletRepo.save(wallet);

    const updatedBalances = await this.walletBalanceRepo.find({
      where: { walletId: wallet.id },
    });

    return updatedBalances.reduce<Record<string, string>>((result, item) => {
      result[item.currency] = item.balance;
      return result;
    }, {});
  }

  async payWithWalletPayment(
    dto: PayWithWalletPaymentInput,
  ) {
    const wallet = await this.walletRepo.findOne({
      where: { userId: dto.userUuid },
      relations: ['balances'],
    });

    if (!wallet) {
      throw new NotFoundException('wallet not found for user');
    }

    const currency = (dto.currency ?? 'usdc').toUpperCase();
    const assetAmount = String(dto.asset_amount);

    const balanceRecord = wallet.balances?.find(
      (b) => b.currency.toUpperCase() === currency,
    );

    const currentBalance = new Decimal(balanceRecord?.balance ?? '0');
    const required = new Decimal(assetAmount);

    if (currentBalance.lessThan(required)) {
      throw new BadRequestException(
        `insufficient ${currency} balance: available ${currentBalance.toFixed(7)}, required ${required.toFixed(7)}`,
      );
    }

    // Create a payment instruction first so the transfer can be reconciled by memo.
    const instructionResult = await this.paymentService.createPaymentInstruction({
      user_uuid: dto.userUuid,
      reference: dto.reference,
      currency,
    });
    const instruction = instructionResult.data;

    const platformPublicKey = this.configService.get<string>('STELLAR_PUBLIC_KEY');
    if (!platformPublicKey) {
      throw new InternalServerErrorException('STELLAR_PUBLIC_KEY is not configured');
    }

    let assetCode: string | undefined;
    let assetIssuer: string | undefined;

    if (currency !== 'XLM') {
      assetCode = currency;
      assetIssuer = this.configService.get<string>('STELLAR_USDC_ISSUER');
      if (!assetIssuer) {
        throw new InternalServerErrorException(
          `STELLAR_USDC_ISSUER is not configured for currency ${currency}`,
        );
      }
    }

    const secret = this.decryptSecretKey(wallet.secretKey);

    let txHash: string;
    try {
      txHash = await this.stellarService.sendPayment(
        secret,
        platformPublicKey,
        assetAmount,
        { assetCode, assetIssuer, memo: instruction.memo },
      );
    } catch (err: any) {
      throw new BadRequestException(
        `on-chain transfer failed: ${err?.message ?? 'unknown error'}`,
      );
    }

    return {
      message: 'Payment submitted successfully. Payment will be confirmed on blockchain confirmation.',
      data: {
        reference: dto.reference,
        memo: instruction.memo,
        public_address: instruction.public_address,
        asset_amount: assetAmount,
        ...(dto.fait_amount !== undefined ? { fait_amount: String(dto.fait_amount) } : {}),
        currency: instruction.currency.toLowerCase(),
        network: instruction.network,
        ...(dto.fait_currency ? { fait_currency: dto.fait_currency } : {}),
        tx_hash: txHash,
      },
    };
  }

  private encryptSecretKey(secretKey: string): string {
    const encryptionSecret = this.configService.get<string>(
      'WALLET_SECRET_ENCRYPTION_KEY',
    );

    if (!encryptionSecret) {
      throw new InternalServerErrorException(
        'WALLET_SECRET_ENCRYPTION_KEY is not configured',
      );
    }

    const key = createHash('sha256').update(encryptionSecret).digest();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(secretKey, 'utf8'),
      cipher.final(),
    ]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptSecretKey(encrypted: string): string {
    const encryptionSecret = this.configService.get<string>(
      'WALLET_SECRET_ENCRYPTION_KEY',
    );

    if (!encryptionSecret) {
      throw new InternalServerErrorException(
        'WALLET_SECRET_ENCRYPTION_KEY is not configured',
      );
    }

    const [ivHex, cipherHex] = encrypted.split(':');
    if (!ivHex || !cipherHex) {
      throw new InternalServerErrorException('malformed encrypted secret key');
    }

    const key = createHash('sha256').update(encryptionSecret).digest();
    const decipher = createDecipheriv(
      'aes-256-cbc',
      key,
      Buffer.from(ivHex, 'hex'),
    );

    return (
      decipher.update(cipherHex, 'hex', 'utf8') + decipher.final('utf8')
    );
  }
}