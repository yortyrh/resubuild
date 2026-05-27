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
