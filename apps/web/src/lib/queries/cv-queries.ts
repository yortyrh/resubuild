'use client';

import { useQuery } from '@tanstack/react-query';
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

export function useCvSection<T = Record<string, unknown>>(
  cvId: string,
  section: CvArraySectionKey,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: cvKeys.section(cvId, section),
    queryFn: () => fetchCvSection<T>(cvId, section),
    enabled: Boolean(cvId) && (options?.enabled ?? true),
    refetchOnWindowFocus: false,
  });
}

export { sectionFetchers };
