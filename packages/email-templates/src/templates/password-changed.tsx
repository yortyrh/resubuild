import { type BrandProps, EmailLayout, Muted, Paragraph } from './layout';

export type PasswordChangedProps = BrandProps;

export const passwordChangedSubject = ({ appName = 'Resubuild' }: BrandProps) =>
  `Your ${appName} password was changed`;

export default function PasswordChanged(brand: PasswordChangedProps) {
  return (
    <EmailLayout preview="Your password was changed" title="Password changed" {...brand}>
      <Paragraph>The password for your account was just changed.</Paragraph>
      <Muted>If this was not you, reset your password right away and review your account.</Muted>
    </EmailLayout>
  );
}

PasswordChanged.PreviewProps = {} satisfies PasswordChangedProps;
