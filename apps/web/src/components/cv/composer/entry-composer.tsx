'use client';

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One CV entry while it is being edited, inside the section's page. Children are
 * laid out with the same rhythm as the export template, so what you type sits
 * where it will print.
 */
export function EntryComposer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>;
}

/** Left/right row, like the template's "Employer ........ Dates" line. */
export function ComposerRow({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1">{left}</div>
      {right ? <div className="flex shrink-0 items-baseline gap-1.5">{right}</div> : null}
    </div>
  );
}

/** Comma between inline fields, shown only when both sides have text. */
export function ComposerSeparator({ show, children = ',' }: { show: boolean; children?: string }) {
  return (
    <span aria-hidden className={cn('text-page-ink', !show && 'invisible')}>
      {children}
    </span>
  );
}

/**
 * Small sans-serif caption naming a block inside the page (e.g. "Summary"). It
 * belongs to the editing chrome, not the CV, so it is set in the UI face.
 */
export function ComposerBlock({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('composer-block pt-2', className)}>
      <div className="text-page-ink-muted mb-1 flex items-baseline gap-2 font-sans text-xs">
        <span className="font-medium">{label}</span>
        {hint ? <span className="opacity-80">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * Collapsible block for fields that are stored but not printed by the template.
 */
export function ComposerExtra({
  label,
  hint,
  defaultOpen = false,
  children,
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="composer-extra group pt-2" open={defaultOpen}>
      <summary className="text-page-ink-muted hover:text-page-ink focus-visible:ring-primary/30 inline-flex cursor-pointer items-center gap-1 rounded-sm font-sans text-xs font-medium focus-visible:outline-none focus-visible:ring-2">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
        {label}
        {hint ? <span className="font-normal opacity-80">{hint}</span> : null}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
