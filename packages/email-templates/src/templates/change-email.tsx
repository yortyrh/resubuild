import { ActionButton, type BrandProps, EmailLayout, Muted, Paragraph } from './layout';

export interface ChangeEmailProps extends BrandProps {
  url: string;
  newEmail: string;
}

export const changeEmailSubject = ({ appName = 'Resubuild' }: BrandProps) =>
  `Confirm your new ${appName} email`;

export default function ChangeEmail({ url, newEmail, ...brand }: ChangeEmailProps) {
  return (
    <EmailLayout preview="Confirm your email change" title="Confirm your new email" {...brand}>
      <Paragraph>
        You asked to change the email of your account to <strong>{newEmail}</strong>.
      </Paragraph>
      <ActionButton href={url} label="Confirm change" />
      <Muted>
        If you did not request this change, ignore this email and your address stays the same.
      </Muted>
    </EmailLayout>
  );
}

ChangeEmail.PreviewProps = {
  url: 'http://localhost:3000/auth/verify?token=preview',
  newEmail: 'new@example.com',
} satisfies ChangeEmailProps;
