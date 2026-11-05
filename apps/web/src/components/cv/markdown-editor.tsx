'use client';

import dynamic from 'next/dynamic';
import { forwardRef, useState } from 'react';
import { MarkdownView } from '@/components/cv/markdown-view';
import { cn } from '@/lib/utils';
import type { MarkdownEditorHandle, MarkdownEditorProps } from './markdown-editor-impl';

/**
 * MDXEditor (Lexical + toolbar + plugins) is ~200 KB gzip, so it is split out of
 * the route bundles and only downloaded when an editor actually mounts.
 */
const MarkdownEditorImpl = dynamic(
  () => import('./markdown-editor-impl').then((mod) => mod.MarkdownEditorImpl),
  {
    ssr: false,
    loading: () => <EditorPlaceholderBox minRows={4} />,
  },
);

function EditorPlaceholderBox({ minRows }: { minRows: number }) {
  return (
    <div
      aria-hidden
      className="border-input bg-background animate-pulse rounded-md border"
      style={{ minHeight: `${minRows * 1.5 + 1.5}rem` }}
    />
  );
}

export interface DeferredMarkdownEditorProps extends MarkdownEditorProps {
  /**
   * Show the rendered Markdown until the user focuses or clicks it, and only then
   * mount the rich editor. Keeps closed forms free of editor instances.
   */
  deferUntilFocus?: boolean;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, DeferredMarkdownEditorProps>(
  function MarkdownEditor({ deferUntilFocus = false, ...props }, ref) {
    const { className, value = '', placeholder, variant = 'block', ariaLabel } = props;
    const [active, setActive] = useState(!deferUntilFocus);

    if (!active) {
      const label = ariaLabel ?? placeholder ?? 'Edit text';
      return (
        <div
          className={cn(
            'markdown-editor-idle group relative cursor-text rounded-md px-3 py-2.5 transition-colors',
            className,
          )}
        >
          {value.trim() ? (
            <MarkdownView value={value} variant={variant} />
          ) : (
            <p className="text-muted-foreground text-sm">{placeholder ?? label}</p>
          )}
          <button
            type="button"
            aria-label={label}
            className="focus-visible:ring-primary/30 absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-2"
            onClick={() => setActive(true)}
            onFocus={() => setActive(true)}
          />
        </div>
      );
    }

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
        <MarkdownEditorImpl ref={ref} {...props} autoFocus={props.autoFocus ?? deferUntilFocus} />
      </>
    );
  },
);

export type { MarkdownEditorHandle, MarkdownEditorProps };
