import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarTransactionEntity } from './stellar-transaction.entity';
import { StellarTransactionService } from './stellar-transaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([StellarTransactionEntity])],
  providers: [StellarTransactionService],
  exports: [StellarTransactionService],
})
export class StellarTransactionModule {}
