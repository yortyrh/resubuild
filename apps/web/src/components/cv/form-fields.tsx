'use client';

import { type ReactNode, useId } from 'react';
import { MarkdownEditor } from '@/components/cv/markdown-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** Label row shared by every CV form field: name, optional marker, short hint. */
export function FieldLabel({
  htmlFor,
  label,
  description,
  descriptionId,
  required = false,
  aside,
}: {
  htmlFor?: string;
  label: string;
  description?: string;
  descriptionId?: string;
  required?: boolean;
  aside?: ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-[0.8125rem] font-medium">
          {label}
          {required ? (
            <span className="text-muted-foreground ml-1 font-normal">(required)</span>
          ) : null}
        </Label>
        {aside}
      </div>
      {description ? (
        <p id={descriptionId} className="text-muted-foreground text-xs leading-snug">
          {description}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  description?: string;
  value?: string | null;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'url' | 'tel';
  multiline?: boolean;
  /** Long-form Markdown (summaries, descriptions). Single-line values never use it. */
  markdown?: boolean;
  placeholder?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  className?: string;
}

export function TextField({
  label,
  description,
  value,
  onChange,
  type = 'text',
  multiline = false,
  markdown = false,
  placeholder,
  required = false,
  error,
  autoComplete,
  className,
}: TextFieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const safeValue = value ?? '';
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;

  const control = markdown ? (
    <MarkdownEditor
      deferUntilFocus
      ariaLabel={label}
      value={safeValue}
      onChange={onChange}
      placeholder={placeholder}
    />
  ) : multiline ? (
    <Textarea
      id={id}
      value={safeValue}
      placeholder={placeholder}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <Input
      id={id}
      type={type}
      value={safeValue}
      placeholder={placeholder}
      autoComplete={autoComplete ?? 'off'}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <FieldLabel
        htmlFor={markdown ? undefined : id}
        label={label}
        description={description}
        descriptionId={descriptionId}
        required={required}
      />
      {control}
      {error ? (
        <p id={errorId} className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A titled group of fields inside an entry form. On wide screens the title sits
 * in a narrow left column, so every form in the editor shares one left edge.
 */
export function FormGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      className={cn(
        'border-border/70 grid min-w-0 gap-x-6 gap-y-3 border-t pt-4 first:border-t-0 first:pt-0 md:grid-cols-[8.5rem_minmax(0,1fr)]',
        className,
      )}
    >
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="text-foreground pt-0.5 text-sm font-semibold">
        {title}
      </p>
      <div className="min-w-0 space-y-4">{children}</div>
    </fieldset>
  );
}

/** Two equal columns from `sm`, one column on phones. */
export function FieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;
}
