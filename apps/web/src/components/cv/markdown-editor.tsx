'use client';

import { cn } from '@/lib/utils';
import type { MarkdownEditorProps } from './markdown-editor-impl';
import { MarkdownEditorImpl } from './markdown-editor-impl';

export function MarkdownEditor(props: MarkdownEditorProps) {
  const { className, value = '', placeholder, variant = 'block' } = props;

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
