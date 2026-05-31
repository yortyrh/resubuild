import { describe, expect, it } from 'vitest';
import {
  applicationProgressLabel,
  applicationProgressPercent,
} from '@/lib/application-prepare-progress';

describe('application prepare progress', () => {
  it('maps prepare steps to percent and labels', () => {
    expect(applicationProgressPercent('tailoring')).toBeGreaterThan(40);
    expect(applicationProgressLabel('drafting_letter')).toBe('Writing cover letter…');
  });

  it('uses shorter update step list', () => {
    expect(applicationProgressPercent('tailoring', { isUpdate: true })).toBeGreaterThan(
      applicationProgressPercent('selecting_cv', { isUpdate: false }),
    );
  });
});
