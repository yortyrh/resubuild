'use client';

import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/** Shared affordance for resume external links — color, underline, optional icon. */
export const resumeExternalLinkClassName =
  'inline-flex max-w-full items-center gap-1 text-sky-700 underline decoration-sky-700/50 underline-offset-2 transition-colors hover:text-sky-900 hover:decoration-sky-900 dark:text-sky-400 dark:decoration-sky-400/50 dark:hover:text-sky-300';

/**
 * Normalizes a raw URL string for safe navigation.
 * - Returns `null` for empty, whitespace-only, or unsafe-scheme inputs.
 * - Passes through `mailto:` and `tel:` unchanged.
 * - Prepends `https://` when no recognized scheme is present.
 */
export function normalizeResumeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (!SAFE_SCHEMES.includes(url.protocol)) return null;
    return trimmed;
  } catch {
    // No valid scheme — treat as bare hostname and prepend https://
    const withScheme = `https://${trimmed}`;
    try {
      const url = new URL(withScheme);
      if (url.protocol !== 'https:') return null;
      return withScheme;
    } catch {
      return null;
    }
  }
}

interface ExternalLinkProps {
  href: string | undefined | null;
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

export function ExternalLink({ href, children, className, showIcon = true }: ExternalLinkProps) {
  const normalized = normalizeResumeUrl(href);
  if (!normalized) return null;

  const label = children ?? href?.trim();

  return (
    <a
      href={normalized}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(resumeExternalLinkClassName, 'text-sm', className)}
      title={normalized}
    >
      <span className="min-w-0 break-words">{label}</span>
      {showIcon ? (
        <ExternalLinkIcon className="size-3 shrink-0 opacity-80" aria-hidden="true" />
      ) : null}
    </a>
  );
}

const TITLE_LINK_CLASS = 'font-inherit decoration-2';

const SUBTITLE_LINK_CLASS = 'text-sm';

/** Entity label in a row title — plain text when URL is missing or unsafe. */
export function linkedEntityLabel(label: string, url?: string | null): ReactNode {
  if (!label) return null;
  const normalized = normalizeResumeUrl(url);
  if (!normalized) return label;
  return (
    <ExternalLink href={url} className={TITLE_LINK_CLASS}>
      {label}
    </ExternalLink>
  );
}

/** Entity label in a row subtitle — stands out from muted row copy when linked. */
export function linkedEntitySubtitle(label: string, url?: string | null): ReactNode {
  if (!label) return null;
  const normalized = normalizeResumeUrl(url);
  if (!normalized) return label;
  return (
    <ExternalLink href={url} className={SUBTITLE_LINK_CLASS}>
      {label}
    </ExternalLink>
  );
}
