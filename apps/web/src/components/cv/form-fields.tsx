'use client';

import { Trash2 } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef } from 'react';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TextFieldProps {
  label: string;
  description?: string;
  value?: string | null;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'url';
  multiline?: boolean;
  markdown?: 'inline' | 'block';
  placeholder?: string;
}

export function TextField({
  label,
  description,
  value,
  onChange,
  type = 'text',
  multiline = false,
  markdown,
  placeholder,
}: TextFieldProps) {
  const safeValue = value ?? '';
  const control = markdown ? (
    <MarkdownEditor
      value={safeValue}
      onChange={onChange}
      variant={markdown}
      placeholder={placeholder}
    />
  ) : multiline ? (
    <Textarea
      value={safeValue}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <Input
      type={type}
      value={safeValue}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  const descriptionEl = description ? (
    <p className="text-muted-foreground text-sm">{description}</p>
  ) : null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {control}
      {descriptionEl}
    </div>
  );
}

interface StringListFieldProps {
  label: string;
  description?: string;
  values?: string[];
  onChange: (values: string[]) => void;
  markdown?: boolean;
}

function focusListItem(input: HTMLInputElement | null): boolean {
  if (!input) {
    return false;
  }
  input.focus();
  return true;
}

export function StringListField({
  label,
  description,
  values = [],
  onChange,
  markdown = false,
}: StringListFieldProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pendingFocusIndex = useRef<number | null>(null);

  const updateItem = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };

  const scheduleFocus = (index: number) => {
    if (markdown) {
      return;
    }
    pendingFocusIndex.current = index;
  };

  const addItem = () => {
    scheduleFocus(values.length);
    onChange([...values, '']);
  };

  const removeItem = (index: number) =>
    onChange(values.filter((_, itemIndex) => itemIndex !== index));

  const handleItemEnter = (index: number, event: KeyboardEvent) => {
    if (markdown || event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (index === values.length - 1) {
      scheduleFocus(values.length);
      onChange([...values, '']);
    }
  };

  useEffect(() => {
    if (markdown) {
      return undefined;
    }

    const focusIndex = pendingFocusIndex.current;
    if (focusIndex === null) {
      return undefined;
    }

    pendingFocusIndex.current = null;
    focusListItem(inputRefs.current[focusIndex]);
    return undefined;
  }, [values, markdown]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      <div className="space-y-3">
        {values.map((value, index) =>
          markdown ? (
            <div key={index} className="string-list-markdown-editor relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 z-10 size-7"
                aria-label="Remove"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <MarkdownEditor
                value={value}
                onChange={(next) => updateItem(index, next)}
                variant="inline"
              />
            </div>
          ) : (
            <div key={index} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  value={value}
                  onChange={(e) => updateItem(index, e.target.value)}
                  onKeyDown={(event) => {
                    handleItemEnter(index, event);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => removeItem(index)}
              >
                Remove
              </Button>
            </div>
          ),
        )}
        <Button type="button" variant="secondary" onClick={addItem}>
          Add {label}
        </Button>
      </div>
    </div>
  );
}
