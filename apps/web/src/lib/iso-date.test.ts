import { describe, expect, it } from 'vitest';
import {
  convertIsoDatePrecision,
  formatIsoDate,
  fromNativeInputValue,
  parseIsoDate,
  toNativeInputValue,
} from './iso-date';

describe('iso-date helpers', () => {
  describe('parseIsoDate', () => {
    it('parses year, month, and date precisions', () => {
      expect(parseIsoDate('2024')).toEqual({
        precision: 'year',
        year: '2024',
      });
      expect(parseIsoDate('2024-03')).toEqual({
        precision: 'month',
        year: '2024',
        month: '03',
      });
      expect(parseIsoDate('2024-03-15')).toEqual({
        precision: 'date',
        year: '2024',
        month: '03',
        day: '15',
      });
    });

    it('handles whitespace trimming', () => {
      expect(parseIsoDate('  2026-09  ')).toEqual({
        precision: 'month',
        year: '2026',
        month: '09',
      });
    });

    it('returns null for invalid values', () => {
      expect(parseIsoDate('')).toBeNull();
      expect(parseIsoDate('abcd')).toBeNull();
    });
  });

  describe('formatIsoDate', () => {
    it('formats based on precision with sensible defaults', () => {
      expect(formatIsoDate('year', { year: '1984' })).toBe('1984');
      expect(formatIsoDate('month', { year: '1984', month: '12' })).toBe('1984-12');
      expect(formatIsoDate('month', { year: '1984' })).toBe('1984');
      expect(formatIsoDate('date', { year: '1984', month: '12', day: '31' })).toBe('1984-12-31');
      expect(formatIsoDate('date', { year: '1984', month: '12' })).toBe('1984-12-01');
    });

    it('returns empty without year', () => {
      expect(formatIsoDate('month', { year: '' })).toBe('');
    });
  });

  describe('convertIsoDatePrecision', () => {
    it('rescales formatted output', () => {
      expect(convertIsoDatePrecision('2024', 'month')).toBe('2024');
      expect(convertIsoDatePrecision('2024-09-30', 'month')).toBe('2024-09');
      expect(convertIsoDatePrecision('2024-09-30', 'year')).toBe('2024');
    });

    it('returns empty when unparsable', () => {
      expect(convertIsoDatePrecision('oops', 'date')).toBe('');
    });
  });

  describe('toNativeInputValue', () => {
    it('returns native input subsets', () => {
      expect(toNativeInputValue('2024', 'year')).toBe('2024');
      expect(toNativeInputValue('2024-11', 'month')).toBe('2024-11');
      expect(toNativeInputValue('2024-11-02', 'date')).toBe('2024-11-02');
    });
  });

  describe('fromNativeInputValue', () => {
    it('captures numeric year prefixes', () => {
      expect(fromNativeInputValue('1999', 'year')).toBe('1999');
    });

    it('passthrough raw month/date strings', () => {
      expect(fromNativeInputValue('2024-11', 'month')).toBe('2024-11');
    });

    it('handles empty inputs', () => {
      expect(fromNativeInputValue('', 'year')).toBe('');
    });
  });
});
