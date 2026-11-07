import { BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentInstructionDto } from './dto/create-payment-instruction.dto';
import { PaymentInstructionType } from './payment-instruction.entity';
import { PaymentType } from './payment.entity';

describe('PaymentService', () => {
  const instructionRepo = {
    findOne: jest.fn(),
    create: jest.fn((values) => values),
    save: jest.fn(async (instruction) => ({ id: 'instruction-1', ...instruction })),
  };
  const paymentRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((values) => values),
    save: jest.fn(async (payment) => ({ id: 'payment-1', createdAt: new Date(), ...payment })),
  };
  const webhookQueue = { add: jest.fn() };
  const configService = {
    get: jest.fn(() => 'GTESTPLATFORMPUBLICKEY1234567890123456789012345678901234'),
  };

  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    instructionRepo.findOne.mockResolvedValue(null);
    paymentRepo.findOne.mockResolvedValue(null);
    service = new PaymentService(
      instructionRepo as any,
      paymentRepo as any,
      webhookQueue as any,
      configService as any,
    );
  });

  it('creates a wallet top-up instruction without an amount or reference', async () => {
    const result = await service.createWalletTopupInstruction({
      user_uuid: 'USR8K2M9QX',
    } as any);

    expect(instructionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PaymentInstructionType.WALLET_TOPUP,
        userUuid: 'USR8K2M9QX',
        reference: null,
        currency: 'USDC',
      }),
    );
    expect(result.data).not.toHaveProperty('amount');
    expect(result.data).not.toHaveProperty('reference');
    expect(result.data).not.toHaveProperty('status');
  });

  it('creates a payment instruction with the supplied reference', async () => {
    const result = await service.createPaymentInstruction({
      user_uuid: 'USR8K2M9QX',
      reference: 'ORDER-123',
    } as CreatePaymentInstructionDto);

    expect(instructionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PaymentInstructionType.PAYMENT_ORDER,
        userUuid: 'USR8K2M9QX',
        reference: 'ORDER-123',
      }),
    );
    expect(result.data.reference).toBe('ORDER-123');
  });

  it('returns the existing instruction for an existing user instead of creating another', async () => {
    instructionRepo.findOne.mockResolvedValueOnce({
      id: 'instruction-existing',
      type: PaymentInstructionType.WALLET_TOPUP,
      userUuid: 'USR8K2M9QX',
      reference: null,
      memo: '87654321',
      publicAddress: 'GTESTPLATFORMPUBLICKEY1234567890123456789012345678901234',
      currency: 'USDC',
      network: 'stellar',
      status: null,
    });

    const result = await service.createWalletTopupInstruction({
      user_uuid: 'USR8K2M9QX',
    } as any);

    expect(result.data.memo).toBe('87654321');
    expect(instructionRepo.save).not.toHaveBeenCalled();
  });

  it('creates a currency-specific wallet top-up instruction with the existing memo', async () => {
    instructionRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
      id: 'instruction-existing',
      type: PaymentInstructionType.WALLET_TOPUP,
      userUuid: 'USR8K2M9QX',
      reference: null,
      memo: '87654321',
      publicAddress: 'GTESTPLATFORMPUBLICKEY1234567890123456789012345678901234',
      currency: 'USDC',
      network: 'stellar',
      status: null,
      });

    const result = await service.createWalletTopupInstruction({
      user_uuid: 'USR8K2M9QX',
      currency: 'xlm',
    } as any);

    expect(instructionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        memo: '87654321',
        currency: 'XLM',
        publicAddress: 'GTESTPLATFORMPUBLICKEY1234567890123456789012345678901234',
      }),
    );
    expect(result.data).toEqual(
      expect.objectContaining({ memo: '87654321', currency: 'XLM' }),
    );
  });

  it('looks up memo instructions using the incoming currency', async () => {
    instructionRepo.findOne.mockResolvedValueOnce(null);

    await service.findByMemoOrReference('87654321', 'xlm');

    expect(instructionRepo.findOne).toHaveBeenCalledWith({
      where: [
        { memo: '87654321', currency: 'XLM' },
        { reference: '87654321' },
      ],
    });
  });

  it('returns the existing payment-order instruction when the reference is repeated', async () => {
    instructionRepo.findOne.mockResolvedValueOnce({
      id: 'instruction-existing',
      type: PaymentInstructionType.PAYMENT_ORDER,
      userUuid: 'USR8K2M9QX',
      reference: 'ORDER-123',
      memo: '87654321',
      publicAddress: 'GTESTPLATFORMPUBLICKEY1234567890123456789012345678901234',
      currency: 'USDC',
      network: 'stellar',
      status: 'pending',
    });

    const result = await service.createPaymentInstruction({
      user_uuid: 'USR8K2M9QX',
      reference: 'ORDER-123',
    } as CreatePaymentInstructionDto);

    expect(result.data.reference).toBe('ORDER-123');
    expect(instructionRepo.save).not.toHaveBeenCalled();
  });

  it('rejects payment instructions without a reference', async () => {
    await expect(
      service.createPaymentInstruction({
        user_uuid: 'USR8K2M9QX',
        reference: '   ',
      } as CreatePaymentInstructionDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    [PaymentInstructionType.WALLET_TOPUP, 'wallet.topup.received'],
    [PaymentInstructionType.PAYMENT_ORDER, 'payment.received'],
  ])('dispatches %s received event after chain payment', async (type, event) => {
    const instruction = {
      id: 'instruction-1',
      type,
      userUuid: 'USR8K2M9QX',
      reference: type === PaymentInstructionType.PAYMENT_ORDER ? 'ORDER-123' : null,
      memo: '12345678',
      publicAddress: 'GTESTPLATFORMPUBLICKEY1234567890123456789012345678901234',
      currency: 'USDC',
      network: 'stellar',
      status:
        type === PaymentInstructionType.WALLET_TOPUP ? null : 'pending',
    } as any;
    await service.applyIncomingPayment(instruction, {
      memo: '12345678',
      currency: 'USDC',
      amount: '3.5',
      transactionHash: `tx-${event}`,
    });

    expect(paymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userUuid: 'USR8K2M9QX',
        type:
          type === PaymentInstructionType.WALLET_TOPUP
            ? PaymentType.WALLET_TOPUP
            : PaymentType.PAYMENT_ORDER,
      }),
    );

    expect(webhookQueue.add).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        payload: expect.objectContaining({
          event,
          user_uuid: 'USR8K2M9QX',
          type:
            type === PaymentInstructionType.WALLET_TOPUP
              ? PaymentInstructionType.WALLET_TOPUP
              : PaymentInstructionType.PAYMENT_ORDER,
        }),
      }),
      expect.anything(),
    );
    if (type === PaymentInstructionType.WALLET_TOPUP) {
      expect(instruction.status).toBeNull();
    }
  });
});
