import { sortAwardRows, sortPublicationRows, sortWorkRows } from '@resumind/types';

export type WithItemId = { id?: string };

/** Replace or append an item matched by `id`. */
export function mergeItemById<T extends WithItemId>(items: T[], item: T): T[] {
  const id = item.id;
  if (!id) {
    return [...items, item];
  }
  const index = items.findIndex((entry) => entry.id === id);
  if (index < 0) {
    return [...items, item];
  }
  const next = [...items];
  next[index] = item;
  return next;
}

/** Remove the item with the given row id. */
export function removeItemById<T extends WithItemId>(items: T[], id: string): T[] {
  return items.filter((entry) => entry.id !== id);
}

export function getItemId(item: WithItemId, label: string): string {
  if (!item.id) {
    throw new Error(`${label} is missing a row id. Reload the page and try again.`);
  }
  return item.id;
}

/** Stable row ids in current list order (throws if any row lacks id). */
export function getOrderedItemIds<T extends WithItemId>(items: T[], label: string): string[] {
  return items.map((item) => getItemId(item, label));
}

/** Move the entry at `fromIndex` to `toIndex` in an id list. */
export function reorderIdsByIndex(ids: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return ids;
  }
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) {
    return ids;
  }
  next.splice(toIndex, 0, moved);
  return next;
}

export function moveIdUp(ids: string[], index: number): string[] | null {
  if (index <= 0 || index >= ids.length) {
    return null;
  }
  return reorderIdsByIndex(ids, index, index - 1);
}

export function moveIdDown(ids: string[], index: number): string[] | null {
  if (index < 0 || index >= ids.length - 1) {
    return null;
  }
  return reorderIdsByIndex(ids, index, index + 1);
}

export function idsOrderEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** Reorder items to match the given id sequence; unknown ids are omitted. */
export function orderItemsByIds<T extends WithItemId>(items: T[], order: string[]): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    if (item.id) {
      byId.set(item.id, item);
    }
  }
  return order.map((id) => byId.get(id)).filter((item): item is T => item !== undefined);
}

function reorderBySortedRowIds<T extends WithItemId>(
  items: T[],
  sortedRows: { id: string }[],
): T[] {
  const byId = new Map(items.filter((item) => item.id).map((item) => [item.id!, item]));
  const seen = new Set<string>();
  const result: T[] = [];

  for (const row of sortedRows) {
    const item = byId.get(row.id);
    if (item) {
      result.push(item);
      seen.add(row.id);
    }
  }

  for (const item of items) {
    if (!item.id || !seen.has(item.id)) {
      result.push(item);
    }
  }

  return result;
}

/** Sort date-range section items (work, volunteer, education, projects) by end date. */
export function sortDateRangeSectionItems<
  T extends { id?: string; startDate?: string; endDate?: string },
>(items: T[]): T[] {
  const rows = items.map((item, index) => ({
    id: item.id ?? `__unsaved-${index}`,
    cv_id: '',
    start_date: item.startDate ?? null,
    end_date: item.endDate ?? null,
  }));
  return reorderBySortedRowIds(items, sortWorkRows(rows));
}

/** Sort awards or certificates by date descending. */
export function sortDatedSectionItems<T extends { id?: string; date?: string }>(items: T[]): T[] {
  const rows = items.map((item, index) => ({
    id: item.id ?? `__unsaved-${index}`,
    cv_id: '',
    date: item.date ?? null,
  }));
  return reorderBySortedRowIds(items, sortAwardRows(rows));
}

/** Sort publications by release date descending. */
export function sortPublicationSectionItems<T extends { id?: string; releaseDate?: string }>(
  items: T[],
): T[] {
  const rows = items.map((item, index) => ({
    id: item.id ?? `__unsaved-${index}`,
    cv_id: '',
    release_date: item.releaseDate ?? null,
  }));
  return reorderBySortedRowIds(items, sortPublicationRows(rows));
}
