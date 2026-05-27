/** Insert an item at the index returned by the API (defaults to end). */
export function insertAtIndex<T>(items: T[], item: T, index?: number): T[] {
  const next = [...items];
  next.splice(index ?? next.length, 0, item);
  return next;
}

/** Move/replace an item using the sorted index returned by the API. */
export function replaceAtSortedIndex<T>(
  items: T[],
  fromIndex: number,
  item: T,
  sortedIndex?: number,
): T[] {
  const toIndex = sortedIndex ?? fromIndex;
  const next = [...items];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
