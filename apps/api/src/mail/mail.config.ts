import type { ConfigService } from '@nestjs/config';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface MailConfig {
  /** nodemailer SMTP options, or null when SMTP is not configured. */
  smtp: SMTPTransport.Options | string | null;
  from: string;
  appName: string;
  appUrl?: string;
}

function truthy(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
}

/**
 * Reads SMTP settings. Either `SMTP_URL` (`smtp://user:pass@host:587`,
 * `smtps://…`) or `SMTP_HOST` + optional `SMTP_PORT`, `SMTP_SECURE`,
 * `SMTP_USER`, `SMTP_PASSWORD`. Any SMTP server works (Mailpit locally;
 * SES, Postmark, Resend, Mailgun, Brevo, a self-hosted MTA… in production).
 */
export function readMailConfig(config: ConfigService): MailConfig {
  const get = (key: string) => config.get<string>(key)?.trim() || undefined;
  const appName = get('APP_NAME') ?? 'Resubuild';
  const from = get('MAIL_FROM') ?? `${appName} <no-reply@localhost>`;
  const appUrl = get('APP_URL');

  const url = get('SMTP_URL');
  if (url) {
    return { smtp: url, from, appName, appUrl };
  }

  const host = get('SMTP_HOST');
  if (!host) {
    return { smtp: null, from, appName, appUrl };
  }

  const port = Number(get('SMTP_PORT') ?? 587);
  const user = get('SMTP_USER');
  const pass = get('SMTP_PASSWORD');
  return {
    smtp: {
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: truthy(get('SMTP_SECURE')) ?? port === 465,
      ...(user ? { auth: { user, pass: pass ?? '' } } : {}),
    },
    from,
    appName,
    appUrl,
  };
}
