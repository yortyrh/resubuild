import { X } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface AuthPageShellProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Centered auth card layout shared by login, register, and related flows.
 *
 * The shell renders a close icon button anchored to the top-right corner of
 * the card so any visitor who lands on an auth page (deep-link, OAuth
 * callback, password reset) has a visible path back to the public marketing
 * landing page at `/`. The button is intentionally neutral — it uses the
 * existing auth surface tokens and does not import the marketing font or any
 * `--marketing-*` token (see the `visual-design-system` spec: "Auth pages
 * are unchanged").
 */
export function AuthPageShell({ title, description, children, footer }: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-dvh min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-16">
      <Card className="relative w-full max-w-md">
        <Link
          href="/"
          aria-label="Close and return to Resubuild home"
          className="text-muted-foreground hover:text-foreground absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors sm:right-4 sm:top-4"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Link>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          {children ?? null}
          {footer}
        </CardContent>
      </Card>
    </div>
  );
}
