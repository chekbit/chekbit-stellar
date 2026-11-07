import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('stellar_listener_state')
export class StellarListenerStateEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/**
	 * Horizon cursor position (paging token)
	 * Used to resume listening from where we left off
	 */
	@Column({ type: 'varchar', length: 100, nullable: true })
	cursor: string | null;

	/**
	 * Last successfully processed Stellar ledger sequence number
	 */
	@Column({ type: 'bigint', nullable: true })
	lastProcessedLedger: number | null;

	/**
	 * Count of transactions processed since last state update
	 */
	@Column({ type: 'int', default: 0 })
	processedCount: number;

	/**
	 * Last time the state was updated
	 */
	@UpdateDateColumn()
	updatedAt: Date;
}
