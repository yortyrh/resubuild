'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { MarkdownEditorHandle, MarkdownEditorProps } from './markdown-editor-impl';
import { MarkdownEditorImpl } from './markdown-editor-impl';

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(props, ref) {
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
        <MarkdownEditorImpl ref={ref} {...props} />
      </>
    );
  },
);

export type { MarkdownEditorHandle, MarkdownEditorProps };
