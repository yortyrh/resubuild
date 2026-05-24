'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { MarkdownEditorProps } from './markdown-editor-impl';

/**
 * Wysimark/Slate use Emotion which emits `:first-child` selectors at runtime.
 * Next.js warns this is unsafe during server rendering, so we render the actual
 * editor only on the client (`ssr: false`) and show a stable placeholder during
 * server render & hydration to avoid layout shift.
 */
const MarkdownEditorImpl = dynamic(
  () => import('./markdown-editor-impl').then((mod) => mod.MarkdownEditorImpl),
  {
    ssr: false,
    loading: () => null,
  },
);

export function MarkdownEditor(props: MarkdownEditorProps) {
  const { variant = 'block', className, value = '', placeholder } = props;

  return (
    <>
      <noscript>
        <textarea
          className={cn(
            'border-input bg-background w-full rounded-md border p-3 text-sm',
            className,
          )}
          rows={variant === 'inline' ? 3 : 8}
          defaultValue={value}
          placeholder={placeholder}
          readOnly
        />
      </noscript>
      <MarkdownEditorImpl {...props} />
    </>
  );
}

export type { MarkdownEditorProps };
