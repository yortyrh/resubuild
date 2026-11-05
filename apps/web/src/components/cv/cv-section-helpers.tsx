'use client';

import type { ReactNode } from 'react';
import { linkedEntityLabel, linkedEntitySubtitle } from '@/components/cv/external-link';
import { MarkdownView } from '@/components/cv/markdown-view';

export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) {
    return '';
  }
  if (!end) {
    return start ? `${start} – Current` : '';
  }
  return `${start ?? ''} – ${end}`;
}

export function validateRequiredStartDate(item: {
  startDate?: string;
}): Record<string, string> | null {
  if (!item.startDate?.trim()) {
    return { startDate: 'Start date is required' };
  }
  return null;
}

export function validateRequiredDateOnCreate(
  item: { date?: string },
  mode: 'create' | 'edit',
): Record<string, string> | null {
  if (mode === 'create' && !item.date?.trim()) {
    return { date: 'Date is required' };
  }
  return null;
}

export function validateRequiredReleaseDateOnCreate(
  item: { releaseDate?: string },
  mode: 'create' | 'edit',
): Record<string, string> | null {
  if (mode === 'create' && !item.releaseDate?.trim()) {
    return { releaseDate: 'Release date is required' };
  }
  return null;
}

export function trimStringList(values?: string[]): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export function highlightBody(values?: string[], options?: { markdown?: boolean; title?: string }) {
  if (!values?.length) {
    return null;
  }
  const useMarkdown = options?.markdown ?? false;
  const title = options?.title;
  return (
    <div className="mt-1">
      {title ? <p className="text-page-ink-muted text-[0.875rem] italic">{title}</p> : null}
      <ul className="marker:text-page-ink list-disc space-y-0.5 pl-5 font-normal">
        {values.map((value, index) => (
          <li key={index}>
            {useMarkdown ? <MarkdownView value={value} variant="inline" /> : value}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function positionEntityView(
  position: string | undefined,
  entity: string | undefined,
  url: string | undefined,
  fallback: string,
): { title: ReactNode; subtitle?: ReactNode } {
  const linkedEntitySubtitleNode = entity ? linkedEntitySubtitle(entity, url) : null;
  const linkedEntityTitleNode = entity ? linkedEntityLabel(entity, url) : null;

  if (position) {
    return {
      title: <span>{position}</span>,
      subtitle: linkedEntitySubtitleNode ?? (entity ? <span>{entity}</span> : undefined),
    };
  }
  if (linkedEntityTitleNode) {
    return { title: <span>{linkedEntityTitleNode}</span> };
  }
  if (entity) {
    return { title: <span>{entity}</span> };
  }
  return { title: <span>{fallback}</span> };
}

/**
 * Heading for a dated entry, set like the export template: the organization
 * (linked when it has a URL) and location on the first line, the role in italics
 * below.
 */
export function printedEntryView(
  entity: string | undefined,
  url: string | undefined,
  location: string | undefined,
  role: string | undefined,
  fallback: string,
): { title: ReactNode; subtitle?: ReactNode } {
  const entityNode = entity ? linkedEntityLabel(entity, url) : null;
  if (!entityNode && !role) {
    return { title: <span>{fallback}</span> };
  }
  if (!entityNode) {
    return { title: <span>{role}</span> };
  }
  return {
    title: (
      <span>
        {entityNode}
        {location ? <span className="font-normal">, {location}</span> : null}
      </span>
    ),
    subtitle: role ? <span>{role}</span> : undefined,
  };
}
