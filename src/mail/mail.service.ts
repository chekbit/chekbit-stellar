import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(name: string, jobData: any) {
    const { email, otp, payslip } = jobData;
    let mail: any;
    let attachments: any = [];

    switch (name) {
     
    }

    return this.mailerService.sendMail({
      to: mail.to,
      subject: mail.subject,
      template: mail.template,
      context: mail.context,
      attachments,
    });
  }
}
