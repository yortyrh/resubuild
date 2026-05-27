import { describe, expect, it } from 'vitest';
import { insertAtIndex, replaceAtSortedIndex } from './cv-section-order';

describe('insertAtIndex', () => {
  it('appends when index is omitted', () => {
    expect(insertAtIndex(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('inserts at the given index', () => {
    expect(insertAtIndex(['b', 'c'], 'a', 0)).toEqual(['a', 'b', 'c']);
    expect(insertAtIndex(['a', 'c'], 'b', 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('replaceAtSortedIndex', () => {
  it('replaces in place when sorted index matches', () => {
    expect(replaceAtSortedIndex(['a', 'b', 'c'], 1, 'B', 1)).toEqual(['a', 'B', 'c']);
  });

  it('moves an item earlier in the list', () => {
    expect(replaceAtSortedIndex(['a', 'b', 'c'], 2, 'C', 0)).toEqual(['C', 'a', 'b']);
  });

  it('moves an item later in the list', () => {
    expect(replaceAtSortedIndex(['a', 'b', 'c'], 0, 'A', 2)).toEqual(['b', 'c', 'A']);
  });
});
