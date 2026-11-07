import { Test, TestingModule } from '@nestjs/testing';
import { StellarController } from './stellar.controller';
import { StellarService } from './stellar.service';

describe('StellarController', () => {
  let controller: StellarController;
  let stellarService: {
    generateWallet: jest.Mock;
    generateWalletWithUsdcTrustline: jest.Mock;
    executePlatformSwap: jest.Mock;
    fundTestnetWalletByUserId: jest.Mock;
  };

  beforeEach(async () => {
    stellarService = {
      generateWallet: jest.fn().mockReturnValue({
        publicKey: 'GTESTPUBLICKEY1234567890123456789012345678901234567890123',
        secret: 'STESTSECRETKEY1234567890123456789012345678901234567890123',
      }),
      generateWalletWithUsdcTrustline: jest.fn().mockResolvedValue({
        message: 'Stellar wallet created with USDC trustline',
        data: {
          publicKey: 'GTESTPUBLICKEY1234567890123456789012345678901234567890123',
          secretKey: 'STESTSECRETKEY1234567890123456789012345678901234567890123',
          asset: 'USDC',
          trustlineCreated: true,
          startingBalanceXlm: '2',
          transactionHash: 'transaction-hash',
        },
      }),
      executePlatformSwap: jest.fn().mockResolvedValue({
        message: 'XLM swap submitted successfully',
        data: { transactionHash: 'swap-transaction' },
      }),
      fundTestnetWalletByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StellarController],
      providers: [
        {
          provide: StellarService,
          useValue: stellarService,
        },
      ],
    }).compile();

    controller = module.get<StellarController>(StellarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a newly generated Stellar address pair', () => {
    const result = controller.generateWallet();

    expect(stellarService.generateWallet).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: 'Stellar address pair generated successfully',
      data: {
        publicKey: 'GTESTPUBLICKEY1234567890123456789012345678901234567890123',
        secret: 'STESTSECRETKEY1234567890123456789012345678901234567890123',
      },
    });
  });

  it('should delegate wallet creation with a USDC trustline to the service', async () => {
    const result = await controller.generateWalletWithUsdcTrustline();

    expect(stellarService.generateWalletWithUsdcTrustline).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: 'Stellar wallet created with USDC trustline',
      data: expect.objectContaining({
        asset: 'USDC',
        trustlineCreated: true,
      }),
    });
  });

  it('should execute XLM-to-USDC swaps from the platform wallet', () => {
    const dto = { amount: 10, slippagePercent: 0.5 };

    controller.swapXlmToUsdc(dto);

    expect(stellarService.executePlatformSwap).toHaveBeenCalledWith(
      'XLM',
      10,
      0.5,
    );
  });

  it('should execute USDC-to-XLM swaps from the platform wallet', () => {
    const dto = { amount: 25, slippagePercent: 1 };

    controller.swapUsdcToXlm(dto);

    expect(stellarService.executePlatformSwap).toHaveBeenCalledWith(
      'USDC',
      25,
      1,
    );
  });
});
