import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StellarController } from './stellar.controller';
import { StellarService } from './stellar.service';
import { ConfigModule } from '@nestjs/config';
import { StellarListenerStateModule } from '../stellar-listener-state/stellar-listener-state.module';
import { IncomingTransactionQueue } from '../queue/queue.constants';

@Module({
  imports: [
    ConfigModule,
    StellarListenerStateModule,
    BullModule.registerQueue({ name: IncomingTransactionQueue.name }),
  ],
  controllers: [StellarController],
  providers: [StellarService],
  exports: [StellarService],
})
export class StellarModule {}
