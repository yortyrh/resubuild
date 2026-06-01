import { describe, expect, it } from 'vitest';
import {
  formatDateRange,
  validateRequiredDateOnCreate,
  validateRequiredReleaseDateOnCreate,
  validateRequiredStartDate,
} from './cv-section-helpers';

describe('formatDateRange', () => {
  it('returns empty string when both dates are missing', () => {
    expect(formatDateRange()).toBe('');
    expect(formatDateRange(undefined, undefined)).toBe('');
  });

  it('shows Current when end date is absent', () => {
    expect(formatDateRange('2000-10-12')).toBe('2000-10-12 – Current');
  });

  it('shows completed range when both dates are set', () => {
    expect(formatDateRange('2018-01', '2020-06')).toBe('2018-01 – 2020-06');
  });
});

describe('date validation helpers', () => {
  it('requires start date for date-range sections', () => {
    expect(validateRequiredStartDate({})).toEqual({ startDate: 'Start date is required' });
    expect(validateRequiredStartDate({ startDate: '2020-01' })).toBeNull();
  });

  it('requires date on create for awards and certificates', () => {
    expect(validateRequiredDateOnCreate({}, 'create')).toEqual({ date: 'Date is required' });
    expect(validateRequiredDateOnCreate({}, 'edit')).toBeNull();
    expect(validateRequiredDateOnCreate({ date: '2021-05' }, 'create')).toBeNull();
  });

  it('requires release date on create for publications', () => {
    expect(validateRequiredReleaseDateOnCreate({}, 'create')).toEqual({
      releaseDate: 'Release date is required',
    });
    expect(validateRequiredReleaseDateOnCreate({}, 'edit')).toBeNull();
  });
});
