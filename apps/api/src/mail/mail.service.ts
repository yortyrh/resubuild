import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type EmailTemplateName,
  type EmailTemplateProps,
  renderEmail,
} from '@resubuild/email-templates';
import { createTransport, type Transporter } from 'nodemailer';
import { type MailConfig, readMailConfig } from './mail.config';

export interface SentMail {
  messageId: string;
  /** False when no SMTP server is configured and the mail was only logged (non-production). */
  delivered: boolean;
}

/**
 * Sends transactional email over plain SMTP. Templates live in
 * `@resubuild/email-templates`; this service only renders and delivers.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly settings: MailConfig;
  private transporter: Transporter | null = null;

  constructor(configService: ConfigService) {
    this.settings = readMailConfig(configService);
  }

  onModuleInit(): void {
    if (this.settings.smtp) return;
    const hint = 'Set SMTP_URL or SMTP_HOST (plus MAIL_FROM) to deliver email.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[MailService] SMTP is required in production: ${hint}`);
    }
    this.logger.warn(`SMTP not configured; emails are logged instead of sent. ${hint}`);
  }

  isConfigured(): boolean {
    return this.settings.smtp !== null;
  }

  private transport(): Transporter | null {
    if (!this.settings.smtp) return null;
    this.transporter ??= createTransport(this.settings.smtp);
    return this.transporter;
  }

  async send<K extends EmailTemplateName>(
    template: K,
    to: string,
    props: EmailTemplateProps[K],
  ): Promise<SentMail> {
    const email = await renderEmail(template, {
      appName: this.settings.appName,
      appUrl: this.settings.appUrl,
      ...props,
    });

    const transport = this.transport();
    if (!transport) {
      this.logger.log(`[mail:${template}] to=${to} subject="${email.subject}"\n${email.text}`);
      return { messageId: `logged-${Date.now()}`, delivered: false };
    }

    const info = await transport.sendMail({
      from: this.settings.from,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return { messageId: String(info.messageId ?? ''), delivered: true };
  }
}
