import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WebhookEntity,
  WebhookStatus,
  WebhookType,
} from './webhook.entity';

export interface DispatchWebhookPayload {
  type: WebhookType;
  reference?: string;
  payload: Record<string, any>;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(WebhookEntity)
    private readonly webhookRepository: Repository<WebhookEntity>,
  ) {}

  async sendWebhook(input: DispatchWebhookPayload): Promise<void> {
    const chekbitBackendApiWebhookUrl = this.configService.get<string>(
      'CHEKBIT_BACKEND_API_WEBHOOK_URL',
      'http://localhost:8000/api/webhooks/stellar',
    );

    const webhook = await this.webhookRepository.save({
      type: input.type,
      reference: input.reference,
      status: WebhookStatus.PENDING,
      payload: input.payload,
    });

    try {
      this.logger.log(
        `Sending webhook [${input.type}] to Chekbit Backend API: ${chekbitBackendApiWebhookUrl}`,
        JSON.stringify({ reference: input.reference }),
      );

      await this.httpService.axiosRef.post(chekbitBackendApiWebhookUrl, input.payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': this.configService.get<string>('WEBHOOK_SECRET'),
        },
      });

      await this.webhookRepository.update(
        { id: webhook.id },
        { status: WebhookStatus.SENT },
      );

      this.logger.log(`Webhook sent successfully: ${input.reference ?? webhook.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send webhook: ${error.message}`,
        error?.stack,
      );

      await this.webhookRepository.update(
        { id: webhook.id },
        {
          status: WebhookStatus.FAILED,
          error_message: error.message,
        },
      );

      throw error;
    }
  }
}
