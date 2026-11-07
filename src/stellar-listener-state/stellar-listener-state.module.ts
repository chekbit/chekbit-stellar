import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarListenerStateEntity } from './stellar-listener-state.entity';
import { StellarListenerStateService } from './stellar-listener-state.service';

@Module({
	imports: [TypeOrmModule.forFeature([StellarListenerStateEntity])],
	providers: [StellarListenerStateService],
	exports: [StellarListenerStateService],
})
export class StellarListenerStateModule {}
