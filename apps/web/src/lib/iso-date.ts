export type IsoDatePrecision = 'year' | 'month' | 'date';

export interface IsoDateParts {
  year: string;
  month?: string;
  day?: string;
}

const ISO_YEAR = /^([1-2]\d{3})$/;
const ISO_MONTH = /^([1-2]\d{3})-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^([1-2]\d{3})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function parseIsoDate(
  value: string,
): (IsoDateParts & { precision: IsoDatePrecision }) | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dateMatch = trimmed.match(ISO_DATE);
  if (dateMatch) {
    return {
      precision: 'date',
      year: dateMatch[1],
      month: dateMatch[2],
      day: dateMatch[3],
    };
  }

  const monthMatch = trimmed.match(ISO_MONTH);
  if (monthMatch) {
    return {
      precision: 'month',
      year: monthMatch[1],
      month: monthMatch[2],
    };
  }

  const yearMatch = trimmed.match(ISO_YEAR);
  if (yearMatch) {
    return {
      precision: 'year',
      year: yearMatch[1],
    };
  }

  return null;
}

export function formatIsoDate(precision: IsoDatePrecision, parts: IsoDateParts): string {
  if (!parts.year) {
    return '';
  }

  if (precision === 'year') {
    return parts.year;
  }

  if (precision === 'month') {
    return parts.month ? `${parts.year}-${parts.month}` : parts.year;
  }

  if (parts.month && parts.day) {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  if (parts.month) {
    return `${parts.year}-${parts.month}-01`;
  }

  return parts.year;
}

export function convertIsoDatePrecision(value: string, precision: IsoDatePrecision): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return '';
  }

  return formatIsoDate(precision, parsed);
}

export function toNativeInputValue(value: string, precision: IsoDatePrecision): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return '';
  }

  if (precision === 'year') {
    return parsed.year;
  }

  if (precision === 'month' && parsed.month) {
    return `${parsed.year}-${parsed.month}`;
  }

  if (precision === 'date' && parsed.month && parsed.day) {
    return `${parsed.year}-${parsed.month}-${parsed.day}`;
  }

  return '';
}

export function fromNativeInputValue(raw: string, precision: IsoDatePrecision): string {
  if (!raw) {
    return '';
  }

  if (precision === 'year') {
    const year = raw.replace(/\D/g, '').slice(0, 4);
    return year.length === 4 ? year : year;
  }

  return raw;
}
