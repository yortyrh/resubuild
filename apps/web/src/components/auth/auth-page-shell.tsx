import { X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CvSpecimen } from '@/components/brand/cv-specimen';
import logoSvg from '@/components/landing/logo-vectorized.svg';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface AuthPageShellProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Auth layout shared by login, register, and related flows: the form on the
 * desk, and on large screens a sample CV page beside it.
 *
 * The shell renders a close icon button anchored to the top-right corner of
 * the card so any visitor who lands on an auth page (deep-link, OAuth
 * callback, password reset) has a visible path back to the public marketing
 * landing page at `/`. The button is intentionally neutral — it uses the
 * shared design tokens.
 */
export function AuthPageShell({ title, description, children, footer }: AuthPageShellProps) {
  return (
    <div className="bg-desk grid min-h-dvh min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative flex items-center justify-center px-4 py-8 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="focus-visible:ring-ring absolute left-5 top-5 rounded-sm focus-visible:outline-none focus-visible:ring-2 sm:left-8 sm:top-7"
        >
          <Image src={logoSvg} alt="Resubuild" width={112} height={39} priority />
        </Link>
        <Card className="relative w-full max-w-md">
          <Link
            href="/"
            aria-label="Close and return to Resubuild home"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors sm:right-4 sm:top-4"
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
      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-[hsl(218_15%_10%)] lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20"
      >
        <CvSpecimen className="mx-auto w-full max-w-[30rem] shadow-[0_32px_64px_-24px_rgb(0_0_0/0.6)]" />
        <p className="mx-auto mt-8 max-w-[30rem] text-[0.9375rem] text-[hsl(214_18%_75%)]">
          Your CV, edited as the page it prints on. Import the one you have, tailor it for each job,
          and export a clean PDF.
        </p>
      </aside>
    </div>
  );
}
