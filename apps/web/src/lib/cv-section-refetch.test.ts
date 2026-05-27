import { describe, expect, it } from 'vitest';
import { sectionItemsMissingIds } from './cv-section-refetch';

describe('sectionItemsMissingIds', () => {
  it('returns false for an empty list', () => {
    expect(sectionItemsMissingIds([])).toBe(false);
  });

  it('returns false when every row has an id', () => {
    expect(sectionItemsMissingIds([{ id: 'a' }, { id: 'b' }])).toBe(false);
  });

  it('returns true when any row lacks an id', () => {
    expect(sectionItemsMissingIds([{ id: 'a' }, {}])).toBe(true);
  });
});
