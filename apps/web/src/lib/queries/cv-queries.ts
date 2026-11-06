'use client';

import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CvSectionSlug } from '@/components/cv/cv-section-nav';
import {
  getCv,
  getCvAwards,
  getCvCertificates,
  getCvEducation,
  getCvInterests,
  getCvLanguages,
  getCvProfiles,
  getCvProjects,
  getCvPublications,
  getCvReferences,
  getCvSkills,
  getCvVolunteer,
  getCvWork,
  listCvs,
} from '@/lib/api';
import { cvKeys } from '@/lib/queries/keys';

export type CvArraySectionKey = Exclude<CvSectionSlug, 'basics'>;

const sectionFetchers: Record<
  CvArraySectionKey,
  (cvId: string) => Promise<Record<string, unknown>[]>
> = {
  profiles: getCvProfiles,
  work: getCvWork,
  volunteer: getCvVolunteer,
  education: getCvEducation,
  skills: getCvSkills,
  projects: getCvProjects,
  awards: getCvAwards,
  certificates: getCvCertificates,
  publications: getCvPublications,
  languages: getCvLanguages,
  interests: getCvInterests,
  references: getCvReferences,
};

export function fetchCvSection<T = Record<string, unknown>>(
  cvId: string,
  section: CvArraySectionKey,
): Promise<T[]> {
  return sectionFetchers[section](cvId) as Promise<T[]>;
}

export function useCvList() {
  return useQuery({
    queryKey: cvKeys.list(),
    queryFn: listCvs,
    refetchOnWindowFocus: true,
  });
}

export function useCv(cvId: string) {
  return useQuery({
    queryKey: cvKeys.detail(cvId),
    queryFn: () => getCv(cvId),
    enabled: Boolean(cvId),
  });
}

/** Section list query: the server list, in server order. `undefined` until it has loaded. */
function sectionListQueryOptions<T>(
  queryClient: QueryClient,
  cvId: string,
  section: CvArraySectionKey,
) {
  return {
    queryKey: cvKeys.sectionList(cvId, section),
    queryFn: () => fetchCvSectionList<T>(queryClient, cvId, section),
  };
}

/**
 * Loads a section list and seeds each entry's own key, so cards read their entry
 * without a request of their own. Entries without a string id are returned but not seeded.
 */
export async function fetchCvSectionList<T = Record<string, unknown>>(
  queryClient: QueryClient,
  cvId: string,
  section: CvArraySectionKey,
): Promise<T[]> {
  const items = await fetchCvSection<T>(cvId, section);
  for (const item of items) {
    const itemId = (item as { id?: unknown }).id;
    if (typeof itemId === 'string') {
      queryClient.setQueryData(cvKeys.sectionItem(cvId, section, itemId), item);
    }
  }
  return items;
}

export function useCvSectionList<T = Record<string, unknown>>(
  cvId: string,
  section: CvArraySectionKey,
) {
  const queryClient = useQueryClient();
  return useQuery({
    ...sectionListQueryOptions<T>(queryClient, cvId, section),
    enabled: Boolean(cvId),
    refetchOnWindowFocus: false,
  });
}

/**
 * One section entry. It is kept current by list loads (which seed it) and by
 * mutations (which write it), so it never goes stale on its own; when its key is
 * empty it loads the section list and picks the entry.
 */
export function useCvSectionItem<T = Record<string, unknown>>(
  cvId: string,
  section: CvArraySectionKey,
  itemId: string,
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: cvKeys.sectionItem(cvId, section, itemId),
    queryFn: async () => {
      const items = await queryClient.fetchQuery(
        sectionListQueryOptions<T>(queryClient, cvId, section),
      );
      const item = items.find((entry) => (entry as { id?: unknown }).id === itemId);
      if (!item) {
        throw new Error(`Entry ${itemId} not found in ${section}`);
      }
      return item;
    },
    enabled: Boolean(cvId) && Boolean(itemId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });
}

export { sectionFetchers };
