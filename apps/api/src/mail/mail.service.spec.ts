import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { readMailConfig } from './mail.config';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const config = (env: Record<string, string | undefined>) =>
  ({ get: (key: string) => env[key] }) as unknown as ConfigService;

describe('readMailConfig', () => {
  it('returns no SMTP when nothing is configured', () => {
    expect(readMailConfig(config({}))).toEqual({
      smtp: null,
      from: 'Resubuild <no-reply@localhost>',
      appName: 'Resubuild',
      appUrl: undefined,
    });
  });

  it('accepts SMTP_URL as-is', () => {
    expect(readMailConfig(config({ SMTP_URL: 'smtps://u:p@mail.test:465' })).smtp).toBe(
      'smtps://u:p@mail.test:465',
    );
  });

  it('builds host options with auth and implicit TLS on 465', () => {
    expect(
      readMailConfig(
        config({ SMTP_HOST: 'mail.test', SMTP_PORT: '465', SMTP_USER: 'u', SMTP_PASSWORD: 'p' }),
      ).smtp,
    ).toEqual({ host: 'mail.test', port: 465, secure: true, auth: { user: 'u', pass: 'p' } });
    expect(
      readMailConfig(config({ SMTP_HOST: 'localhost', SMTP_PORT: '1025', SMTP_SECURE: 'false' }))
        .smtp,
    ).toEqual({ host: 'localhost', port: 1025, secure: false });
    expect(readMailConfig(config({ SMTP_HOST: 'h', SMTP_PORT: 'x' })).smtp).toMatchObject({
      port: 587,
      secure: false,
    });
  });

  it('uses MAIL_FROM, APP_NAME and APP_URL', () => {
    expect(
      readMailConfig(config({ MAIL_FROM: 'A <a@x.test>', APP_NAME: 'Acme', APP_URL: 'https://x' })),
    ).toMatchObject({ from: 'A <a@x.test>', appName: 'Acme', appUrl: 'https://x' });
  });
});

describe('MailService', () => {
  const sendMail = jest.fn();

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({ messageId: '<id@test>' });
    jest
      .mocked(createTransport)
      .mockReset()
      .mockReturnValue({ sendMail } as never);
  });

  it('renders the template and sends it over SMTP', async () => {
    const service = new MailService(
      config({
        SMTP_HOST: 'localhost',
        SMTP_PORT: '1025',
        MAIL_FROM: 'R <r@x.test>',
        APP_URL: 'https://app',
      }),
    );
    expect(service.isConfigured()).toBe(true);

    const sent = await service.send('reset-password', 'user@x.test', {
      url: 'https://app/reset?token=t',
    });

    expect(sent).toEqual({ messageId: '<id@test>', delivered: true });
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'R <r@x.test>',
        to: 'user@x.test',
        subject: 'Reset your Resubuild password',
        html: expect.stringContaining('https://app/reset?token=t'),
        text: expect.stringContaining('https://app/reset?token=t'),
      }),
    );

    await service.send('password-changed', 'user@x.test', {});
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it('logs instead of sending when SMTP is not configured (non-production)', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = new MailService(config({}));

    service.onModuleInit();
    const sent = await service.send('otp-code', 'u@x.test', { code: '123456' });

    expect(sent.delivered).toBe(false);
    expect(createTransport).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SMTP not configured'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('123456'));
    log.mockRestore();
    warn.mockRestore();
  });

  it('refuses to start in production without SMTP', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(() => new MailService(config({})).onModuleInit()).toThrow(/SMTP is required/);
    expect(() => new MailService(config({ SMTP_URL: 'smtp://x' })).onModuleInit()).not.toThrow();
    process.env.NODE_ENV = prev;
  });
});
