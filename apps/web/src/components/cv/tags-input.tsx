'use client';

import { X } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { FieldLabel } from '@/components/cv/form-fields';

export const tagPillClassName =
  'bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-[0.8125rem]';

export const roleTagPillClassName =
  'bg-accent text-accent-foreground rounded-md px-2 py-0.5 text-[0.8125rem]';

interface TagsInputProps {
  label: string;
  description?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function splitTags(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Tags in one input-sized box: chips first, then the text field. Enter or a comma
 * adds a tag, Backspace in the empty field removes the last one, and pasting a
 * comma-separated list adds each item.
 */
export function TagsInput({
  label,
  description,
  values,
  onChange,
  placeholder = 'Type and press Enter',
}: TagsInputProps) {
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const descriptionId = `${inputId}-description`;

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

  return (
    <div className="min-w-0 space-y-1.5">
      <FieldLabel
        htmlFor={inputId}
        label={label}
        description={description}
        descriptionId={descriptionId}
      />
      <div className="border-input bg-background hover:border-foreground/30 focus-within:border-primary focus-within:ring-primary/25 flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 transition-colors focus-within:ring-2">
        {values.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-[0.3rem] py-0.5 pl-2 pr-0.5 text-[0.8125rem]"
          >
            {tag}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:bg-background focus-visible:ring-ring/40 rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2"
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
          aria-describedby={description ? descriptionId : undefined}
          placeholder={values.length === 0 ? placeholder : 'Add another…'}
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
            if (draft.trim()) {
              e.preventDefault();
              commitDraft();
              return;
            }
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
          onBlur={commitDraft}
          className="placeholder:text-muted-foreground/80 h-7 min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}
