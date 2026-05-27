'use client';

import type { ReactNode } from 'react';
import { linkedEntityLabel, linkedEntitySubtitle } from '@/components/cv/external-link';
import { MarkdownView } from '@/components/cv/markdown-view';
import { MetadataLabel } from '@/components/cv/metadata-field';

export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) {
    return '';
  }
  if (!end) {
    return start ?? '';
  }
  return `${start ?? ''} – ${end}`;
}

export function trimStringList(values?: string[]): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export function highlightBody(values?: string[], options?: { markdown?: boolean; title?: string }) {
  if (!values?.length) {
    return null;
  }
  const useMarkdown = options?.markdown ?? false;
  const title = options?.title ?? 'Highlights';
  return (
    <div className="mt-3 space-y-2">
      <MetadataLabel>{title}</MetadataLabel>
      <ul className="list-disc space-y-1 pl-5 text-sm font-normal">
        {values.map((value, index) => (
          <li key={`${value}-${index}`}>
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
