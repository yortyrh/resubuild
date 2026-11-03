import { ActionButton, type BrandProps, EmailLayout, Muted, Paragraph } from './layout';

export interface MagicLinkProps extends BrandProps {
  url: string;
  expiresInMinutes?: number;
}

export const magicLinkSubject = ({ appName = 'Resubuild' }: BrandProps) =>
  `Your ${appName} sign-in link`;

export default function MagicLink({ url, expiresInMinutes = 5, ...brand }: MagicLinkProps) {
  return (
    <EmailLayout preview="Sign in with one click" title="Sign in" {...brand}>
      <Paragraph>Use the button below to sign in. No password needed.</Paragraph>
      <ActionButton href={url} label="Sign in" />
      <Muted>This link works once and expires in {expiresInMinutes} minutes.</Muted>
    </EmailLayout>
  );
}

MagicLink.PreviewProps = {
  url: 'http://localhost:3000/auth/magic?token=preview',
} satisfies MagicLinkProps;
