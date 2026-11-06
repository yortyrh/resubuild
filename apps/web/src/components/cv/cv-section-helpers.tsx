'use client';

import type { ReactNode } from 'react';
import { linkedEntityLabel, linkedEntitySubtitle } from '@/components/cv/external-link';
import { MarkdownView } from '@/components/cv/markdown-view';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO date (YYYY, YYYY-MM or YYYY-MM-DD) as "2022", "Mar 2022" or "15 Mar 2022". */
export function formatIsoDate(value?: string): string {
  if (!value) return '';
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  const monthName = month ? MONTHS[Number(month) - 1] : undefined;
  if (!monthName) return year!;
  return day ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${year}`;
}

export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) {
    return '';
  }
  if (!end) {
    return start ? `${formatIsoDate(start)} – Present` : '';
  }
  return `${formatIsoDate(start)} – ${formatIsoDate(end)}`;
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
    <div className="mt-2">
      {title ? <p className="text-muted-foreground mb-1 text-xs font-medium">{title}</p> : null}
      <ul className="marker:text-muted-foreground list-disc space-y-1 pl-5 font-normal">
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
