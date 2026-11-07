import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StellarListenerStateEntity } from './stellar-listener-state.entity';

@Injectable()
export class StellarListenerStateService {
	private readonly logger = new Logger(StellarListenerStateService.name);

	constructor(
		@InjectRepository(StellarListenerStateEntity)
		private readonly repository: Repository<StellarListenerStateEntity>,
	) {}

	/**
	 * Get or create the listener state (singleton per app instance)
	 */
	async getListenerState(): Promise<StellarListenerStateEntity> {
		let state = await this.repository.findOne({ where: {} });

		if (!state) {
			state = this.repository.create({
				cursor: null,
				lastProcessedLedger: null,
				processedCount: 0,
			});
			await this.repository.save(state);
			this.logger.log('Created new listener state record (first run)');
		}

		return state;
	}

	/**
	 * Update cursor position and ledger info after processing a payment
	 */
	async updateCursor(
		cursor: string,
		ledger: number,
	): Promise<StellarListenerStateEntity> {
		const state = await this.getListenerState();

		state.cursor = cursor;
		state.lastProcessedLedger = ledger;
		state.processedCount = (state.processedCount || 0) + 1;

		await this.repository.save(state);

		return state;
	}

	/**
	 * Get the last saved cursor for resuming the stream
	 * Returns 'now' if no previous cursor exists (first run)
	 */
	async getResumeCursor(): Promise<string> {
		try {
			const state = await this.getListenerState();
			if (state.cursor) {
				this.logger.log(
					`Resuming listener from cursor: ${state.cursor} (processed: ${state.processedCount} txs)`,
				);
				return state.cursor;
			}
		} catch (error) {
			this.logger.warn(`Could not load listener state: ${error}`);
		}

		this.logger.log('Starting listener with cursor "now" (no prior state)');
		return 'now';
	}
}
