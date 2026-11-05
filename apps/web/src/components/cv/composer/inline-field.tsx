'use client';

import { type ChangeEvent, type KeyboardEvent, useId, useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type InlineFieldTone = 'name' | 'title' | 'subtitle' | 'body' | 'meta';

const toneClass: Record<InlineFieldTone, string> = {
  name: 'text-3xl font-bold tracking-tight',
  title: 'font-bold',
  subtitle: 'italic',
  body: '',
  meta: 'text-[0.8125rem] text-page-ink-muted',
};

interface InlineFieldProps {
  /** Field name: used as accessible name, placeholder and the focus hint. */
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  tone?: InlineFieldTone;
  type?: 'text' | 'email' | 'url' | 'tel';
  /** Grow vertically and accept newlines (Shift+Enter is not needed). */
  multiline?: boolean;
  placeholder?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  required?: boolean;
  error?: string;
  autoFocus?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/**
 * A borderless field set in the CV's own typography, so the form reads like the
 * printed page. Each field keeps an accessible name and shows its name as a small
 * hint while focused.
 */
export function InlineField({
  label,
  value,
  onChange,
  tone = 'body',
  type = 'text',
  multiline = false,
  placeholder,
  align = 'left',
  className,
  required = false,
  error,
  autoFocus,
  onKeyDown,
}: InlineFieldProps) {
  const errorId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const safeValue = value ?? '';

  // Auto-grow the textarea to its content.
  // biome-ignore lint/correctness/useExhaustiveDependencies: safeValue triggers the resize
  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = '0px';
    node.style.height = `${node.scrollHeight}px`;
  }, [safeValue]);

  const shared = {
    'aria-label': label,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    'aria-required': required || undefined,
    placeholder: placeholder ?? label,
    autoFocus,
    onKeyDown,
    className: cn(
      'composer-field w-full min-w-0 bg-transparent',
      toneClass[tone],
      align === 'right' && 'text-right',
      align === 'center' && 'text-center',
      error && 'composer-field--error',
    ),
  };

  return (
    <span className={cn('composer-slot relative block min-w-0', className)} data-label={label}>
      {multiline ? (
        <textarea
          ref={textareaRef}
          rows={1}
          value={safeValue}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
          {...shared}
          className={cn(shared.className, 'resize-none overflow-hidden')}
        />
      ) : (
        <input
          type={type}
          value={safeValue}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          {...shared}
        />
      )}
      {error ? (
        <span id={errorId} className="text-destructive mt-0.5 block font-sans text-xs">
          {error}
        </span>
      ) : null}
    </span>
  );
}
