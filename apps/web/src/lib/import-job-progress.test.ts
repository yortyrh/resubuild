import { describe, expect, it } from 'vitest';
import { importProgressLabel, importProgressPercent } from './import-job-progress';

describe('import-job-progress', () => {
  it('maps known steps to increasing percentages', () => {
    expect(importProgressPercent('uploading')).toBeLessThan(importProgressPercent('drafting'));
    expect(importProgressPercent('finalizing')).toBeLessThan(importProgressPercent('saving'));
    expect(importProgressPercent('saving')).toBe(100);
  });

  it('labels fetch and save steps', () => {
    expect(importProgressLabel('fetching')).toBe('Fetching URL…');
    expect(importProgressLabel('saving')).toBe('Saving CV…');
  });
});
