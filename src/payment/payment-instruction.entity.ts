import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentEntity } from './payment.entity';
import { StellarTransactionEntity } from '../stellar-transaction/stellar-transaction.entity';

export enum PaymentInstructionType {
  WALLET_TOPUP = 'WALLET_TOPUP',
  PAYMENT_ORDER = 'PAYMENT_ORDER',
}

export enum PaymentInstructionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'stellar_payment_instructions' })
@Index(['reference'], { unique: true })
export class PaymentInstructionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaymentInstructionType })
  type: PaymentInstructionType;

  @Column({ name: 'user_uuid', type: 'varchar', length: 100 })
  userUuid: string;

  @Column({ name: 'reference', type: 'varchar', length: 120, nullable: true })
  reference?: string | null;

  @Index('IDX_stellar_payment_instructions_memo')
  @Column({ type: 'varchar', length: 8 })
  memo: string;

  @Column({ name: 'public_address', type: 'varchar', length: 255 })
  publicAddress: string;

  @Column({ type: 'varchar', length: 10, default: 'USDC' })
  currency: string;

  @Column({ type: 'varchar', length: 80, default: 'stellar' })
  network: string;

  @Column({
    type: 'enum',
    enum: PaymentInstructionStatus,
    default: PaymentInstructionStatus.PENDING,
    nullable: true,
  })
  status?: PaymentInstructionStatus | null;

  @OneToMany(() => PaymentEntity, (payment) => payment.instruction)
  payments: PaymentEntity[];

  @OneToMany(() => StellarTransactionEntity, (transaction) => transaction.paymentInstruction)
  transactions: StellarTransactionEntity[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
