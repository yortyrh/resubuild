'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  convertIsoDatePrecision,
  fromNativeInputValue,
  type IsoDatePrecision,
  parseIsoDate,
  toNativeInputValue,
} from '@/lib/iso-date';

interface IsoDateFieldProps {
  label: string;
  description?: string;
  value?: string;
  onChange: (value: string) => void;
  defaultPrecision?: IsoDatePrecision;
}

const precisionLabels: Record<IsoDatePrecision, string> = {
  year: 'Year',
  month: 'Month',
  date: 'Day',
};

export function IsoDateField({
  label,
  description,
  value = '',
  onChange,
  defaultPrecision = 'month',
}: IsoDateFieldProps) {
  const [precision, setPrecision] = useState<IsoDatePrecision>(
    () => parseIsoDate(value)?.precision ?? defaultPrecision,
  );

  useEffect(() => {
    const nextPrecision = parseIsoDate(value)?.precision ?? defaultPrecision;
    // Defer snapshot update so ESLint/React don't treat this as cascading sync renders.
    queueMicrotask(() => setPrecision(nextPrecision));
  }, [value, defaultPrecision]);

  const handlePrecisionChange = (next: IsoDatePrecision) => {
    setPrecision(next);
    if (value) {
      onChange(convertIsoDatePrecision(value, next));
    }
  };

  const inputValue = toNativeInputValue(value, precision);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex gap-1" role="group" aria-label={`${label} precision`}>
          {(['year', 'month', 'date'] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={precision === option ? 'default' : 'outline'}
              onClick={() => handlePrecisionChange(option)}
            >
              {precisionLabels[option]}
            </Button>
          ))}
        </div>
      </div>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}

      {precision === 'year' ? (
        <Input
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
          type="month"
          value={inputValue}
          onChange={(event) => onChange(fromNativeInputValue(event.target.value, 'month'))}
        />
      ) : null}

      {precision === 'date' ? (
        <Input
          type="date"
          value={inputValue}
          onChange={(event) => onChange(fromNativeInputValue(event.target.value, 'date'))}
        />
      ) : null}
    </div>
  );
}
