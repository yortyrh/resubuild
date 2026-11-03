import { render, toPlainText } from '@react-email/render';
import { createElement, type FunctionComponent } from 'react';
import ChangeEmail, { type ChangeEmailProps, changeEmailSubject } from './templates/change-email';
import type { BrandProps } from './templates/layout';
import MagicLink, { type MagicLinkProps, magicLinkSubject } from './templates/magic-link';
import OtpCode, { type OtpCodeProps, otpCodeSubject } from './templates/otp-code';
import PasswordChanged, {
  type PasswordChangedProps,
  passwordChangedSubject,
} from './templates/password-changed';
import ResetPassword, {
  type ResetPasswordProps,
  resetPasswordSubject,
} from './templates/reset-password';
import VerifyEmail, { type VerifyEmailProps, verifyEmailSubject } from './templates/verify-email';

export type { BrandProps } from './templates/layout';
export type { OtpPurpose } from './templates/otp-code';
export type {
  ChangeEmailProps,
  MagicLinkProps,
  OtpCodeProps,
  PasswordChangedProps,
  ResetPasswordProps,
  VerifyEmailProps,
};

/** Props per template name. */
export interface EmailTemplateProps {
  'verify-email': VerifyEmailProps;
  'reset-password': ResetPasswordProps;
  'magic-link': MagicLinkProps;
  'otp-code': OtpCodeProps;
  'change-email': ChangeEmailProps;
  'password-changed': PasswordChangedProps;
}

export type EmailTemplateName = keyof EmailTemplateProps;

interface TemplateEntry<P> {
  component: FunctionComponent<P>;
  subject: (props: P) => string;
}

const TEMPLATES: { [K in EmailTemplateName]: TemplateEntry<EmailTemplateProps[K]> } = {
  'verify-email': { component: VerifyEmail, subject: verifyEmailSubject },
  'reset-password': { component: ResetPassword, subject: resetPasswordSubject },
  'magic-link': { component: MagicLink, subject: magicLinkSubject },
  'otp-code': { component: OtpCode, subject: otpCodeSubject },
  'change-email': { component: ChangeEmail, subject: changeEmailSubject },
  'password-changed': { component: PasswordChanged, subject: passwordChangedSubject },
};

export const EMAIL_TEMPLATE_NAMES = Object.keys(TEMPLATES) as EmailTemplateName[];

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Renders a template to subject + HTML + plain-text alternative. */
export async function renderEmail<K extends EmailTemplateName>(
  name: K,
  props: EmailTemplateProps[K],
): Promise<RenderedEmail> {
  const entry = TEMPLATES[name] as TemplateEntry<EmailTemplateProps[K]>;
  if (!entry) {
    throw new Error(`Unknown email template: ${String(name)}`);
  }
  const html = await render(createElement(entry.component, props));
  return { subject: entry.subject(props), html, text: toPlainText(html) };
}

/** Narrow helper for callers that only pass branding. */
export function withBrand<P extends BrandProps>(props: P, brand: BrandProps): P {
  return { ...brand, ...props };
}
