import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

export interface BrandProps {
  /** Product name shown in the header/footer. */
  appName?: string;
  /** Absolute URL of the web app (footer link). */
  appUrl?: string;
}

const styles = {
  body: { backgroundColor: '#f4f4f5', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0 },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '32px auto',
    maxWidth: '520px',
    padding: '32px',
  },
  brand: { color: '#18181b', fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em' },
  heading: { color: '#18181b', fontSize: '22px', margin: '24px 0 12px' },
  text: { color: '#3f3f46', fontSize: '15px', lineHeight: '24px' },
  button: {
    backgroundColor: '#18181b',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 600,
    padding: '12px 20px',
    textDecoration: 'none',
  },
  code: {
    backgroundColor: '#f4f4f5',
    borderRadius: '6px',
    color: '#18181b',
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '0.3em',
    padding: '12px 16px',
    textAlign: 'center' as const,
  },
  muted: { color: '#71717a', fontSize: '13px', lineHeight: '20px' },
  link: { color: '#2563eb', wordBreak: 'break-all' as const },
};

export function EmailLayout({
  preview,
  title,
  appName = 'Resubuild',
  appUrl,
  children,
}: BrandProps & { preview: string; title: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{appName.toUpperCase()}</Text>
          <Heading as="h1" style={styles.heading}>
            {title}
          </Heading>
          {children}
          <Hr />
          <Text style={styles.muted}>
            {appName}
            {appUrl ? ` · ${appUrl}` : ''}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={styles.text}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

/** Primary call to action plus the raw URL for clients that block buttons. */
export function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <>
      <Section style={{ margin: '24px 0' }}>
        <Button href={href} style={styles.button}>
          {label}
        </Button>
      </Section>
      <Muted>
        Or paste this link into your browser:{' '}
        <a href={href} style={styles.link}>
          {href}
        </a>
      </Muted>
    </>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return <Text style={styles.code}>{code}</Text>;
}
