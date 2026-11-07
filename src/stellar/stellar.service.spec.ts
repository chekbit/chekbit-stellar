import { Test, TestingModule } from '@nestjs/testing';
import { StellarService } from './stellar.service';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { IncomingTransactionQueue } from '../queue/queue.constants';
import { StellarListenerStateService } from '../stellar-listener-state/stellar-listener-state.service';
import { DataSource } from 'typeorm';

describe('StellarService', () => {
  let service: StellarService;
  let walletRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    walletRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const values: Record<string, string> = {
                STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
                STELLAR_NETWORK: 'TESTNET',
                STELLAR_PUBLIC_KEY: '',
                STELLAR_SECRET_KEY: 'STESTPLATFORMSECRETKEY1234567890123456789012345678901234567',
                STELLAR_USDC_ISSUER: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
              };

              return values[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: getQueueToken(IncomingTransactionQueue.name),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: StellarListenerStateService,
          useValue: {
            getResumeCursor: jest.fn().mockResolvedValue('now'),
            updateCursor: jest.fn().mockResolvedValue({}),
            getListenerState: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn(() => walletRepo),
          },
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate key pair and print to console', () => {
    const wallet = service.generateWallet();

    console.log('Generated Stellar key pair:', wallet);

    expect(wallet.publicKey).toMatch(/^G[A-Z2-7]{55}$/);
    expect(wallet.secret).toMatch(/^S[A-Z2-7]{55}$/);
  });

  it('should fund test USDC to wallet with user_id user_12345', async () => {
    walletRepo.findOne.mockResolvedValue({
      publicKey: 'GUSER12345PUBLICKEY1234567890123456789012345678901234567',
    });

    const sendPaymentSpy = jest
      .spyOn(service, 'sendPayment')
      .mockResolvedValue('tx-usdc-test-123');
    jest
      .spyOn(service as any, 'ensureTestnetDestinationAccount')
      .mockResolvedValue(undefined);

    const result = await service.fundTestnetWalletByUserId('user_12345', {
      assetCode: 'USDC',
      amount: '25',
    });

    expect(walletRepo.findOne).toHaveBeenCalledWith({
      where: { userId: 'user_12345' },
      select: ['publicKey'],
    });

    expect(sendPaymentSpy).toHaveBeenCalledWith(
      'STESTPLATFORMSECRETKEY1234567890123456789012345678901234567',
      'GUSER12345PUBLICKEY1234567890123456789012345678901234567',
      '25',
      {
        assetCode: 'USDC',
        assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        memo: 'fund-user_12345',
      },
    );

    expect(result).toEqual({
      userId: 'user_12345',
      publicKey: 'GUSER12345PUBLICKEY1234567890123456789012345678901234567',
      assetCode: 'USDC',
      amount: '25',
      txHash: 'tx-usdc-test-123',
    });
  });
});

