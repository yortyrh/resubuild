import { describe, expect, it } from 'vitest';
import {
  getOrderedItemIds,
  idsOrderEqual,
  moveIdDown,
  moveIdUp,
  orderItemsByIds,
  reorderIdsByIndex,
} from './cv-section-order';

describe('cv-section-order reorder helpers', () => {
  it('reorderIdsByIndex moves an id', () => {
    expect(reorderIdsByIndex(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('moveIdUp returns null at top', () => {
    expect(moveIdUp(['a', 'b'], 0)).toBeNull();
    expect(moveIdUp(['a', 'b'], 1)).toEqual(['b', 'a']);
  });

  it('moveIdDown returns null at bottom', () => {
    expect(moveIdDown(['a', 'b'], 1)).toBeNull();
    expect(moveIdDown(['a', 'b'], 0)).toEqual(['b', 'a']);
  });

  it('getOrderedItemIds throws when id missing', () => {
    expect(() => getOrderedItemIds([{ id: undefined }], 'Skill')).toThrow(/row id/);
  });

  it('orderItemsByIds reorders by id list', () => {
    const items = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    expect(orderItemsByIds(items, ['b', 'a'])).toEqual([
      { id: 'b', name: 'B' },
      { id: 'a', name: 'A' },
    ]);
  });

  it('idsOrderEqual compares id sequences', () => {
    expect(idsOrderEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(idsOrderEqual(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});
