'use client';

import dynamic from 'next/dynamic';
import { MarkdownEditorSkeleton } from '@/components/cv/markdown-editor-skeleton';
import { cn } from '@/lib/utils';
import type { MarkdownEditorProps } from './markdown-editor-impl';

/**
 * Wysimark/Slate use Emotion which emits `:first-child` selectors at runtime.
 * Next.js warns this is unsafe during server rendering, so we render the actual
 * editor only on the client (`ssr: false`) and show a skeleton during server
 * render, hydration, and chunk loading to avoid layout shift.
 */
const InlineMarkdownEditorImpl = dynamic(
  () => import('./markdown-editor-impl').then((mod) => mod.MarkdownEditorImpl),
  {
    ssr: false,
    loading: () => <MarkdownEditorSkeleton variant="inline" />,
  },
);

const BlockMarkdownEditorImpl = dynamic(
  () => import('./markdown-editor-impl').then((mod) => mod.MarkdownEditorImpl),
  {
    ssr: false,
    loading: () => <MarkdownEditorSkeleton variant="block" />,
  },
);

export function MarkdownEditor(props: MarkdownEditorProps) {
  const { variant = 'block', className, value = '', placeholder } = props;
  const EditorImpl = variant === 'inline' ? InlineMarkdownEditorImpl : BlockMarkdownEditorImpl;

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
      <EditorImpl {...props} />
    </>
  );
}

export type { MarkdownEditorProps };
