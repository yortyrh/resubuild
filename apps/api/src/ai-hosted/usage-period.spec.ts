import { usagePeriod, usagePeriodResetsAt } from './usage-period';

describe('usage period', () => {
  it('uses UTC calendar months', () => {
    expect(usagePeriod(new Date('2026-11-30T23:59:59Z'))).toBe('2026-11');
    expect(usagePeriodResetsAt(new Date('2026-11-30T23:59:59Z'))).toBe('2026-12-01T00:00:00.000Z');
    expect(usagePeriodResetsAt(new Date('2026-12-15T00:00:00Z'))).toBe('2027-01-01T00:00:00.000Z');
  });
});
