'use client';

import { useEffect, useId, useState } from 'react';
import {
  convertIsoDatePrecision,
  fromNativeInputValue,
  type IsoDatePrecision,
  parseIsoDate,
  toNativeInputValue,
} from '@/lib/iso-date';
import { cn } from '@/lib/utils';

const precisionLabels: Record<IsoDatePrecision, string> = {
  year: 'Year',
  month: 'Month',
  date: 'Day',
};

interface InlineDateFieldProps {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  defaultPrecision?: IsoDatePrecision;
  required?: boolean;
  error?: string;
  /** Shown under the empty field, e.g. "Present" for an open end date. */
  emptyHint?: string;
}

/**
 * Compact ISO date input for the page composer. The precision switch (year,
 * month, day) appears while the field has focus.
 */
export function InlineDateField({
  label,
  value,
  onChange,
  defaultPrecision = 'month',
  required = false,
  error,
  emptyHint,
}: InlineDateFieldProps) {
  const errorId = useId();
  const safeValue = value ?? '';
  const [precision, setPrecision] = useState<IsoDatePrecision>(
    () => parseIsoDate(safeValue)?.precision ?? defaultPrecision,
  );

  useEffect(() => {
    const next = parseIsoDate(safeValue)?.precision;
    if (next) queueMicrotask(() => setPrecision(next));
  }, [safeValue]);

  const changePrecision = (next: IsoDatePrecision) => {
    setPrecision(next);
    if (safeValue) onChange(convertIsoDatePrecision(safeValue, next));
  };

  const inputValue = toNativeInputValue(safeValue, precision);
  const shared = {
    'aria-label': label,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: cn(
      'composer-field composer-date w-[8.5rem] bg-transparent text-right text-[0.875rem] tabular-nums',
      !safeValue && emptyHint && 'composer-date--empty',
      error && 'composer-field--error',
    ),
  };

  return (
    <span className="composer-date-slot group/date relative inline-flex flex-col items-end">
      {precision === 'year' ? (
        <input
          type="number"
          min={1000}
          max={2999}
          step={1}
          placeholder={emptyHint ?? 'YYYY'}
          value={inputValue}
          onChange={(event) => onChange(fromNativeInputValue(event.target.value, 'year'))}
          {...shared}
        />
      ) : (
        <input
          type={precision === 'month' ? 'month' : 'date'}
          value={inputValue}
          data-empty-hint={emptyHint}
          onChange={(event) => onChange(fromNativeInputValue(event.target.value, precision))}
          {...shared}
        />
      )}
      {!safeValue && emptyHint ? (
        <span
          aria-hidden
          className="composer-date-hint text-page-ink-muted pointer-events-none absolute right-0 top-0 text-[0.875rem]"
        >
          {emptyHint}
        </span>
      ) : null}
      <fieldset
        aria-label={`${label} precision`}
        className="composer-precision text-page-ink-muted absolute right-0 top-full z-10 mt-1 hidden gap-0.5 rounded-full border-0 bg-[hsl(var(--page))] p-0.5 font-sans text-[11px] shadow-[0_0_0_1px_hsl(var(--page-rule))] group-focus-within/date:flex"
      >
        {(['year', 'month', 'date'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={precision === option}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => changePrecision(option)}
            className={cn(
              'rounded-full px-2 py-0.5',
              precision === option ? 'bg-primary text-primary-foreground' : 'hover:text-page-ink',
            )}
          >
            {precisionLabels[option]}
          </button>
        ))}
      </fieldset>
      {error ? (
        <span id={errorId} className="text-destructive mt-0.5 font-sans text-xs">
          {error}
        </span>
      ) : null}
    </span>
  );
}
