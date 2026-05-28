const ISO_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const MONTH_YEAR = /^([A-Za-z]{3,9})\s+(\d{4})$/;

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

function normalizeDateValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (ISO_DATE.test(trimmed)) {
    return trimmed;
  }

  const monthYearMatch = trimmed.match(MONTH_YEAR);
  if (monthYearMatch) {
    const monthKey = monthYearMatch[1].slice(0, 3).toLowerCase();
    const month = MONTHS[monthKey];
    if (month) {
      return `${monthYearMatch[2]}-${month}`;
    }
    return monthYearMatch[2];
  }

  const yearMatch = trimmed.match(/^(\d{4})/);
  if (yearMatch) {
    return yearMatch[1];
  }

  return trimmed;
}

function normalizeSectionDates(section: unknown): unknown {
  if (!Array.isArray(section)) {
    return section;
  }

  return section.map((item) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const record = { ...(item as Record<string, unknown>) };
    for (const key of ['startDate', 'endDate', 'date', 'releaseDate', 'awardDate']) {
      if (key in record) {
        record[key] = normalizeDateValue(record[key]);
      }
    }
    return record;
  });
}

export function normalizeDatesTool(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  for (const key of [
    'work',
    'volunteer',
    'education',
    'awards',
    'certificates',
    'publications',
    'projects',
  ]) {
    if (key in next) {
      next[key] = normalizeSectionDates(next[key]);
    }
  }
  return next;
}
