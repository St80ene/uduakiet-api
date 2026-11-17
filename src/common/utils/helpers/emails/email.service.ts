import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, {
  Mail,
  SMTPSentMessageInfo,
  SMTPTransportOptions,
} from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Mail<SMTPSentMessageInfo, SMTPTransportOptions>;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_SENDER'),
        pass: this.configService.get<string>('EMAIL_APP_PASSWORD'),
      },
    });
  }

  async sendEmail(to: string) {
    return this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USER'),
      to,
      subject: 'Testing Email Integration',
      text: 'Hello! My NestJS application just sent its first email.',
      html: '<h2>Hello!</h2><p>My NestJS application just sent its first email.</p>',
    });
  }
}
