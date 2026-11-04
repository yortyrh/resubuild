import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type EmailTemplateName,
  type EmailTemplateProps,
  renderEmail,
} from '@resubuild/email-templates';
import { createTransport, type Transporter } from 'nodemailer';
import { type MailConfig, type ResendConfig, readMailConfig } from './mail.config';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

interface OutgoingMail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SentMail {
  messageId: string;
  /** False when no mail transport is configured and the mail was only logged (non-production). */
  delivered: boolean;
}

/**
 * Sends transactional email over the Resend HTTPS API (`RESEND_API_KEY`) or
 * plain SMTP. Templates live in `@resubuild/email-templates`; this service only
 * renders and delivers.
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
    if (this.isConfigured()) return;
    const hint = 'Set RESEND_API_KEY, SMTP_URL or SMTP_HOST (plus MAIL_FROM) to deliver email.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[MailService] A mail transport is required in production: ${hint}`);
    }
    this.logger.warn(`Mail not configured; emails are logged instead of sent. ${hint}`);
  }

  isConfigured(): boolean {
    return this.settings.resend !== null || this.settings.smtp !== null;
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

    const mail: OutgoingMail = {
      from: this.settings.from,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    };

    if (this.settings.resend) {
      return this.sendViaResend(this.settings.resend, mail);
    }

    const transport = this.transport();
    if (!transport) {
      this.logger.log(`[mail:${template}] to=${to} subject="${email.subject}"\n${email.text}`);
      return { messageId: `logged-${Date.now()}`, delivered: false };
    }

    const info = await transport.sendMail(mail);
    return { messageId: String(info.messageId ?? ''), delivered: true };
  }

  private async sendViaResend(resend: ResendConfig, mail: OutgoingMail): Promise<SentMail> {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resend.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...mail, to: [mail.to] }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) {
      throw new Error(
        `[MailService] Resend rejected the email (HTTP ${response.status}): ${body.message ?? response.statusText}`,
      );
    }
    return { messageId: String(body.id ?? ''), delivered: true };
  }
}
