'use client';

import { useEffect, useId, useState } from 'react';
import { FieldLabel } from '@/components/cv/form-fields';
import { Input } from '@/components/ui/input';
import {
  convertIsoDatePrecision,
  fromNativeInputValue,
  type IsoDatePrecision,
  parseIsoDate,
  toNativeInputValue,
} from '@/lib/iso-date';
import { cn } from '@/lib/utils';

interface IsoDateFieldProps {
  label: string;
  description?: string;
  value?: string | null;
  onChange: (value: string) => void;
  defaultPrecision?: IsoDatePrecision;
  required?: boolean;
  error?: string;
}

const precisionLabels: Record<IsoDatePrecision, string> = {
  year: 'Year',
  month: 'Month',
  date: 'Day',
};

export function IsoDateField({
  label,
  description,
  value,
  onChange,
  defaultPrecision = 'month',
  required = false,
  error,
}: IsoDateFieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;
  const safeValue = value ?? '';
  const [precision, setPrecision] = useState<IsoDatePrecision>(
    () => parseIsoDate(safeValue)?.precision ?? defaultPrecision,
  );

  useEffect(() => {
    const nextPrecision = parseIsoDate(safeValue)?.precision ?? defaultPrecision;
    // Defer snapshot update so ESLint/React don't treat this as cascading sync renders.
    queueMicrotask(() => setPrecision(nextPrecision));
  }, [safeValue, defaultPrecision]);

  const handlePrecisionChange = (next: IsoDatePrecision) => {
    setPrecision(next);
    if (safeValue) {
      onChange(convertIsoDatePrecision(safeValue, next));
    }
  };

  const inputValue = toNativeInputValue(safeValue, precision);

  const inputProps = {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
    className: 'tabular-nums',
  };

  return (
    <div className="min-w-0 space-y-1.5">
      <FieldLabel
        htmlFor={id}
        label={label}
        description={description}
        descriptionId={descriptionId}
        required={required}
        aside={
          <fieldset
            className="bg-secondary inline-flex rounded-md border-0 p-0.5"
            aria-label={`${label} precision`}
          >
            {(['year', 'month', 'date'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={precision === option}
                onClick={() => handlePrecisionChange(option)}
                className={cn(
                  'focus-visible:ring-ring/40 rounded-[0.3rem] px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
                  precision === option
                    ? 'bg-background text-foreground shadow-[0_0_0_1px_hsl(var(--border))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {precisionLabels[option]}
              </button>
            ))}
          </fieldset>
        }
      />

      {precision === 'year' ? (
        <Input
          {...inputProps}
          type="number"
          min={1000}
          max={2999}
          step={1}
          value={inputValue}
          placeholder="YYYY"
          onChange={(event) => onChange(fromNativeInputValue(event.target.value, 'year'))}
        />
      ) : null}

      {precision === 'month' ? (
        <Input
          {...inputProps}
          type="month"
          value={inputValue}
          onChange={(event) => onChange(fromNativeInputValue(event.target.value, 'month'))}
        />
      ) : null}

      {precision === 'date' ? (
        <Input
          {...inputProps}
          type="date"
          value={inputValue}
          onChange={(event) => onChange(fromNativeInputValue(event.target.value, 'date'))}
        />
      ) : null}
      {error ? (
        <p id={errorId} className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
