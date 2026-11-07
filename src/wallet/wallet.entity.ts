import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WalletBalanceEntity } from './wallet-balance.entity';

export enum WalletType {
  USER = 'user',
  SYSTEM = 'system',
}

@Entity({ name: 'wallets' })
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 100 })
  userId: string;

  @Index({ unique: true })
  @Column({ name: 'public_key', type: 'varchar', length: 120 })
  publicKey: string;

  @Column({ name: 'secret_key', type: 'varchar', length: 512 })
  secretKey: string;

  @Column({ type: 'varchar', length: 50, default: 'stellar' })
  network: string;

  @Column({
    type: 'enum',
    enum: WalletType,
    default: WalletType.USER,
  })
  type: WalletType;

  @Column({ name: 'last_balance_sync_at', type: 'timestamp', nullable: true })
  lastBalanceSyncAt?: Date;

  @OneToMany(() => WalletBalanceEntity, (balance) => balance.wallet)
  balances: WalletBalanceEntity[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}