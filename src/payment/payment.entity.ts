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
import { PaymentInstructionEntity } from './payment-instruction.entity';

export enum PaymentStatus {
  CONFIRMED = 'confirmed',
}

export enum PaymentType {
  WALLET_TOPUP = 'WALLET_TOPUP',
  PAYMENT_ORDER = 'PAYMENT_ORDER',
}

@Entity({ name: 'stellar_payments' })
@Index(['transactionHash', 'instructionId'], { unique: true })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_uuid', type: 'varchar', length: 100 })
  userUuid: string;

  @Column({ type: 'enum', enum: PaymentType })
  type: PaymentType;

  @Index()
  @Column({ name: 'payment_instruction_id', type: 'uuid' })
  instructionId: string;

  @ManyToOne(() => PaymentInstructionEntity, (instruction) => instruction.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_instruction_id' })
  instruction: PaymentInstructionEntity;

  @Column({ name: 'transaction_hash', type: 'varchar', length: 140 })
  transactionHash: string;

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  amount: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ type: 'varchar', length: 80, default: 'stellar' })
  network: string;

  @Column({ name: 'public_address', type: 'varchar', length: 255, nullable: true })
  publicAddress?: string;

  @Column({ name: 'counterparty_address', type: 'varchar', length: 255, nullable: true })
  counterpartyAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  memo?: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.CONFIRMED })
  status: PaymentStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
