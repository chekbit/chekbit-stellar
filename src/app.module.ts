import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GlobalThrottleGuard } from './common/guard/global-throttle.guard';
import { ResponseInterceptor } from './common/interfaces/response.interceptor';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { QueueModule } from './queue/queue.module';
import { QueueDashboardModule } from './queue/queue-dashboard.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarModule } from './stellar/stellar.module';
import { PaymentModule } from './payment/payment.module';
import { StellarTransactionModule } from './stellar-transaction/stellar-transaction.module';
import { WalletModule } from './wallet/wallet.module';
import { AllowSharedTopupMemos1792320000000 } from './payment/migrations/1792320000000-AllowSharedTopupMemos';


type RuntimeEnvironment = 'sandbox' | 'live';

const resolveEnvFilePaths = (): string[] => {
  const rawEnv = String(process.env.APP_ENV ?? 'sandbox').toLowerCase();
  const runtimeEnv: RuntimeEnvironment = rawEnv === 'live' ? 'live' : 'sandbox';

  return [
    `.env.${runtimeEnv}`,
    'src/.env',
    '.env',
  ];
};

const buildDatabaseOptions = (configService: ConfigService) => {
  const dbPort = Number(configService.get<string>('DB_PORT', '3306'));

      const dbAutoSyncRaw = configService.get<string>('DB_SYNC') || '';
        const dbAutoSync = ['true', '1', 'yes', 'on'].includes(
          dbAutoSyncRaw.trim().toLowerCase(),
        );

  return {
    type: 'mysql' as const,
    host: configService.get<string>('DB_HOST', '127.0.0.1'),
    port: Number.isNaN(dbPort) ? 3306 : dbPort,
    username: configService.get<string>('DB_USERNAME', 'root'),
    password: configService.get<string>('DB_PASSWORD', ''),
    database: configService.get<string>('DB_DATABASE', 'chekbit_stellar'),
    synchronize: dbAutoSync,
    autoLoadEntities: true,
    migrations: [AllowSharedTopupMemos1792320000000],
    migrationsRun: true,
  };
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePaths(),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          ...buildDatabaseOptions(configService),
          autoLoadEntities: true,
        };
      },
    }),
    AuthModule,
    QueueModule,
    QueueDashboardModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 10,
        },
      ],
    }),
    StellarModule,
    PaymentModule,
    StellarTransactionModule,
    WalletModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: GlobalThrottleGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
