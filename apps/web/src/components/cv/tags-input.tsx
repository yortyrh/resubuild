'use client';

import { X } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const tagPillClassName = 'bg-muted rounded-md px-2 py-1 text-sm';

export const roleTagPillClassName =
  'bg-primary/10 text-primary rounded-md px-2 py-1 text-sm dark:bg-primary/20';

interface TagsInputProps {
  label: string;
  description?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** `inline`: chips and the field share one line, set inside the page composer. */
  variant?: 'default' | 'inline';
}

function splitTags(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function TagsInput({
  label,
  description,
  values,
  onChange,
  placeholder = 'Type and press Enter',
  variant = 'default',
}: TagsInputProps) {
  const [draft, setDraft] = useState('');
  const inputId = useId();

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const addTags = (tags: string[]) => {
    const next = [...values];
    for (const tag of tags) {
      if (!next.includes(tag)) next.push(tag);
    }
    if (next.length !== values.length) onChange(next);
  };

  const commitDraft = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    if (!values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft('');
  }, [draft, onChange, values]);

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        {values.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="bg-secondary text-foreground inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 font-sans text-[0.8125rem]"
          >
            {tag}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-primary/30 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2"
              aria-label={`Remove ${tag}`}
              onClick={() => removeAt(index)}
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          placeholder={values.length === 0 ? placeholder : 'Add…'}
          onChange={(e) => {
            const next = e.target.value;
            if (/[,;]/.test(next)) {
              addTags(splitTags(next));
              setDraft('');
              return;
            }
            setDraft(next);
          }}
          onPaste={(e) => {
            const parts = splitTags(e.clipboardData.getData('text/plain'));
            if (parts.length < 2) return;
            e.preventDefault();
            addTags(parts);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !draft && values.length > 0) {
              e.preventDefault();
              removeAt(values.length - 1);
              return;
            }
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (draft.trim()) commitDraft();
          }}
          onBlur={commitDraft}
          className="composer-field min-w-[8rem] flex-1 bg-transparent font-sans text-[0.8125rem]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      <div className="flex flex-wrap gap-2">
        {values.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={cn(tagPillClassName, 'inline-flex items-center gap-1')}
          >
            {tag}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${tag}`}
              onClick={() => removeAt(index)}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') {
            return;
          }
          if (draft.trim()) {
            e.preventDefault();
            commitDraft();
            return;
          }
          e.currentTarget.form?.requestSubmit();
        }}
        onBlur={commitDraft}
        className={cn(values.length > 0 && 'mt-1')}
      />
    </div>
  );
}
