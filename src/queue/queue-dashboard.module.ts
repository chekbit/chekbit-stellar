// src/queue/queue-dashboard.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';
import { IncomingTransactionQueue, MailQueue, WebhookQueue } from './queue.constants';
import { INestApplication } from '@nestjs/common';
import { BasicAuthMiddleware } from './basic-auth.middleware';

@Module({
  providers: [BasicAuthMiddleware],
  exports: [BasicAuthMiddleware],
})
export class QueueDashboardModule implements OnModuleInit {
  private serverAdapter = new ExpressAdapter();

  onModuleInit() {
    const redisConnection = {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      // Redis 5 accepts AUTH <password>, not AUTH <username> <password>.
      // The default user is implicit, so don't send it as a username.
      username:
        process.env.REDIS_USERNAME === 'default'
          ? undefined
          : process.env.REDIS_USERNAME || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB || 0),
    };

    const mailQueue = new Queue(MailQueue.name, {
      connection: redisConnection,
    });

    const incomingTransactionQueue = new Queue(IncomingTransactionQueue.name, {
      connection: redisConnection,
    });

    const webhookQueue = new Queue(WebhookQueue.name, {
      connection: redisConnection,
    });

    createBullBoard({
      queues: [
        new BullMQAdapter(mailQueue),
        new BullMQAdapter(incomingTransactionQueue),
        new BullMQAdapter(webhookQueue),
      ],
      serverAdapter: this.serverAdapter,
    });

    this.serverAdapter.setBasePath('/admin/queues');
  }

  public setupDashboard(app: INestApplication, basicAuth: BasicAuthMiddleware) {
    // Apply Basic Auth middleware
    app.use('/admin/queues', basicAuth.use.bind(basicAuth));
    app.use('/admin/queues', this.serverAdapter.getRouter());
  }
}
