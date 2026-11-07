import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DispatchWebhookPayload, WebhookService } from '../webhook/webhook.service';
import { WebhookJob, WebhookQueue } from './queue.constants';

@Processor(WebhookQueue.name)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhookService: WebhookService) {
    super();
  }

  async process(job: Job<DispatchWebhookPayload>): Promise<any> {
    this.logger.log(`Processing webhook job: ${job.name} with ID: ${job.id}`);

    switch (job.name) {
      case WebhookJob.send:
        return this.webhookService.sendWebhook(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }
}
