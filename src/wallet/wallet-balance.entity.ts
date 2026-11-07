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
import { WalletEntity } from './wallet.entity';

@Entity({ name: 'wallet_balances' })
@Index(['walletId', 'currency'], { unique: true })
export class WalletBalanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  walletId: string;

  @ManyToOne(() => WalletEntity, (wallet) => wallet.balances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: WalletEntity;

  @Column({ type: 'varchar', length: 20 })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 24,
    scale: 8,
    default: 0,
  })
  balance: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}