'use client';

import { X } from 'lucide-react';
import { useCallback, useState } from 'react';
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
}

export function TagsInput({
  label,
  description,
  values,
  onChange,
  placeholder = 'Type and press Enter',
}: TagsInputProps) {
  const [draft, setDraft] = useState('');

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

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

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
