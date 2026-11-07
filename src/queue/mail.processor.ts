// src/queue/mail.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

@Injectable()
@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<any, any, string>) {
    const { email } = job.data;
    const { name } = job;
    try {
      await this.mailService.sendEmail(name, job.data);

      this.logger.log(`${name}  email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send ${name} mail to ${email}`, error);
    }
  }
}
