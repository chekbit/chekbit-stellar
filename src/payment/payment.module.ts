import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { WebhookQueue } from '../queue/queue.constants';
import { PaymentController } from './payment.controller';
import { PaymentInstructionEntity } from './payment-instruction.entity';
import { PaymentEntity } from './payment.entity';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([PaymentInstructionEntity, PaymentEntity]),
    BullModule.registerQueue({ name: WebhookQueue.name }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
