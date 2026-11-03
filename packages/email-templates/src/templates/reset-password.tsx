import { ActionButton, type BrandProps, EmailLayout, Muted, Paragraph } from './layout';

export interface ResetPasswordProps extends BrandProps {
  url: string;
  /** Minutes until the link expires. */
  expiresInMinutes?: number;
}

export const resetPasswordSubject = ({ appName = 'Resubuild' }: BrandProps) =>
  `Reset your ${appName} password`;

export default function ResetPassword({
  url,
  expiresInMinutes = 60,
  ...brand
}: ResetPasswordProps) {
  return (
    <EmailLayout preview="Reset your password" title="Reset your password" {...brand}>
      <Paragraph>We received a request to reset the password for your account.</Paragraph>
      <ActionButton href={url} label="Choose a new password" />
      <Muted>
        This link expires in {expiresInMinutes} minutes. If you did not ask for a reset, ignore this
        email: your password stays the same.
      </Muted>
    </EmailLayout>
  );
}

ResetPassword.PreviewProps = {
  url: 'http://localhost:3000/reset-password?token=preview',
} satisfies ResetPasswordProps;
