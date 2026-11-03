import { type BrandProps, CodeBlock, EmailLayout, Muted, Paragraph } from './layout';

export type OtpPurpose = 'sign-in' | 'email-verification' | 'forget-password';

export interface OtpCodeProps extends BrandProps {
  code: string;
  purpose?: OtpPurpose;
  expiresInMinutes?: number;
}

const COPY: Record<OtpPurpose, { title: string; intro: string }> = {
  'sign-in': { title: 'Your sign-in code', intro: 'Enter this code to sign in.' },
  'email-verification': {
    title: 'Verify your email',
    intro: 'Enter this code to verify your email address.',
  },
  'forget-password': {
    title: 'Reset your password',
    intro: 'Enter this code to reset your password.',
  },
};

export const otpCodeSubject = ({ code, appName = 'Resubuild' }: OtpCodeProps) =>
  `${code} is your ${appName} code`;

export default function OtpCode({
  code,
  purpose = 'sign-in',
  expiresInMinutes = 5,
  ...brand
}: OtpCodeProps) {
  const copy = COPY[purpose];
  return (
    <EmailLayout preview={`Your code: ${code}`} title={copy.title} {...brand}>
      <Paragraph>{copy.intro}</Paragraph>
      <CodeBlock code={code} />
      <Muted>The code expires in {expiresInMinutes} minutes. Never share it with anyone.</Muted>
    </EmailLayout>
  );
}

OtpCode.PreviewProps = { code: '493027' } satisfies OtpCodeProps;
