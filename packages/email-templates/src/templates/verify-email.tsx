import { ActionButton, type BrandProps, EmailLayout, Muted, Paragraph } from './layout';

export interface VerifyEmailProps extends BrandProps {
  url: string;
}

export const verifyEmailSubject = ({ appName = 'Resubuild' }: BrandProps) =>
  `Confirm your email for ${appName}`;

export default function VerifyEmail({ url, ...brand }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Confirm your email address" title="Confirm your email" {...brand}>
      <Paragraph>
        Thanks for signing up. Confirm your email address to finish creating your account.
      </Paragraph>
      <ActionButton href={url} label="Confirm email" />
      <Muted>If you did not create an account, you can ignore this email.</Muted>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  url: 'http://localhost:3000/auth/verify?token=preview',
} satisfies VerifyEmailProps;
