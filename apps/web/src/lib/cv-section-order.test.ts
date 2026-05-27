import { describe, expect, it } from 'vitest';
import { getItemId, mergeItemById, removeItemById } from './cv-section-order';

describe('mergeItemById', () => {
  it('replaces an existing item by id', () => {
    expect(mergeItemById([{ id: 'a', name: 'A' }], { id: 'a', name: 'Updated' })).toEqual([
      { id: 'a', name: 'Updated' },
    ]);
  });

  it('appends when id is new', () => {
    expect(mergeItemById([{ id: 'a', name: 'A' }], { id: 'b', name: 'B' })).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
  });
});

describe('removeItemById', () => {
  it('removes the matching row', () => {
    expect(
      removeItemById(
        [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        'a',
      ),
    ).toEqual([{ id: 'b', name: 'B' }]);
  });
});

describe('getItemId', () => {
  it('returns id when present', () => {
    expect(getItemId({ id: 'row-1' }, 'Entry')).toBe('row-1');
  });

  it('throws when id is missing', () => {
    expect(() => getItemId({}, 'Entry')).toThrow(/missing a row id/i);
  });
});
