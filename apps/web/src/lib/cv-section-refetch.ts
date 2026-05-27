import type { WithItemId } from '@/lib/cv-section-order';

export type SectionItem<T> = T & WithItemId;

/** True when any loaded row is missing the stable DB id required for edit/delete. */
export function sectionItemsMissingIds(items: WithItemId[]): boolean {
  return items.length > 0 && items.some((item) => !item.id);
}

/** True when the section should load rows from the API (empty initial state or legacy rows without ids). */
export function sectionItemsNeedHydration(items: WithItemId[]): boolean {
  return items.length === 0 || sectionItemsMissingIds(items);
}

/** Builds a section refetch callback for ManagedArraySection after create. */
export function createSectionRefetch<T extends WithItemId>(
  fetcher: (cvId: string) => Promise<Record<string, unknown>[]>,
  cvId: string,
): () => Promise<T[]> {
  return async () => (await fetcher(cvId)) as T[];
}
