import { describe, expect, it } from 'vitest';
import { EMAIL_TEMPLATE_NAMES, renderEmail, withBrand } from './index';

describe('renderEmail', () => {
  it('renders the verification email with subject, button link and text part', async () => {
    const email = await renderEmail('verify-email', {
      url: 'https://app.example.com/auth/verify?token=abc',
      appName: 'Resubuild',
      appUrl: 'https://app.example.com',
    });

    expect(email.subject).toBe('Confirm your email for Resubuild');
    expect(email.html).toContain('href="https://app.example.com/auth/verify?token=abc"');
    expect(email.html.startsWith('<!DOCTYPE html')).toBe(true);
    expect(email.text).toContain('Confirm email');
    expect(email.text).not.toContain('<');
  });

  it('puts the OTP code in the subject and body per purpose', async () => {
    const email = await renderEmail('otp-code', { code: '123456', purpose: 'forget-password' });
    expect(email.subject).toBe('123456 is your Resubuild code');
    expect(email.text).toContain('123456');
    expect(email.text).toContain('reset your password');
  });

  it('escapes user-provided values', async () => {
    const email = await renderEmail('change-email', {
      url: 'https://x.test/verify',
      newEmail: '<script>alert(1)</script>@x.test',
    });
    expect(email.html).not.toContain('<script>');
  });

  it('renders every registered template', async () => {
    const props = { url: 'https://x.test', code: '000000', newEmail: 'a@b.c' };
    for (const name of EMAIL_TEMPLATE_NAMES) {
      const email = await renderEmail(name, props as never);
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.html.length).toBeGreaterThan(100);
    }
  });

  it('rejects unknown templates', async () => {
    await expect(renderEmail('nope' as never, {} as never)).rejects.toThrow(
      'Unknown email template',
    );
  });

  it('withBrand lets explicit props win over brand defaults', () => {
    expect(withBrand({ url: 'u', appName: 'X' }, { appName: 'Y', appUrl: 'z' })).toEqual({
      url: 'u',
      appName: 'X',
      appUrl: 'z',
    });
  });
});
