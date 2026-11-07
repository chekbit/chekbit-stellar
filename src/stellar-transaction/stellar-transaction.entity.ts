import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentInstructionEntity } from '../payment/payment-instruction.entity';

export enum StellarTransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum StellarTransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

@Entity({ name: 'stellar_transactions' })
@Index(['transactionHash', 'publicAddress', 'type'], { unique: true })
export class StellarTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_uuid', type: 'varchar', length: 100, nullable: true })
  userUuid?: string;

  @Index()
  @Column({ name: 'payment_instruction_id', type: 'uuid', nullable: true })
  paymentInstructionId?: string;

  @ManyToOne(() => PaymentInstructionEntity, (instruction) => instruction.transactions, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_instruction_id' })
  paymentInstruction?: PaymentInstructionEntity;

  @Index()
  @Column({ type: 'varchar', length: 140 })
  transactionHash: string;

  @Column({
    type: 'enum',
    enum: StellarTransactionType,
    default: StellarTransactionType.CREDIT,
  })
  type: StellarTransactionType;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  amount: string;

  @Column({ type: 'varchar', length: 10, default: 'USDC' })
  currency: string;

  @Column({
    type: 'enum',
    enum: StellarTransactionStatus,
    default: StellarTransactionStatus.PENDING,
  })
  status: StellarTransactionStatus;

  @Column({ type: 'varchar', length: 80, nullable: true })
  network?: string;

  @Column({ name: 'public_address', type: 'varchar', length: 255, nullable: true })
  publicAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  memo?: string;

  @Column({ name: 'counterparty_address', type: 'varchar', length: 255, nullable: true })
  counterpartyAddress?: string;

  @Column({ type: 'json', nullable: true })
  rawPayload?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
