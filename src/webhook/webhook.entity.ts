import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WebhookStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum WebhookType {
  STELLAR = 'stellar',
}

@Entity({ name: 'webhooks' })
@Index(['type'])
@Index(['reference'])
@Index(['createdAt'])
export class WebhookEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: WebhookType })
  type: WebhookType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  reference?: string;

  @Column({
    type: 'enum',
    enum: WebhookStatus,
    default: WebhookStatus.PENDING,
  })
  status: WebhookStatus;

  @Column({ type: 'json', nullable: true })
  payload?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
