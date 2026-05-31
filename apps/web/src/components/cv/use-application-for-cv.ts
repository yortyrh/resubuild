'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { type JobApplicationSummary, listApplications } from '@/lib/api';

function resolveApplicationForCv(
  applications: JobApplicationSummary[] | undefined,
  cvId: string,
  applicationIdFromUrl: string | null,
): JobApplicationSummary | null {
  if (!applications?.length) return null;

  if (applicationIdFromUrl) {
    const fromUrl = applications.find((app) => app.id === applicationIdFromUrl);
    if (fromUrl?.tailoredCvId === cvId && fromUrl.status === 'ready') {
      return fromUrl;
    }
  }

  return applications.find((app) => app.tailoredCvId === cvId && app.status === 'ready') ?? null;
}

export function useApplicationForCv(cvId: string): JobApplicationSummary | null {
  const searchParams = useSearchParams();
  const applicationIdFromUrl = searchParams.get('applicationId');

  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: listApplications,
  });

  return useMemo(
    () => resolveApplicationForCv(applications, cvId, applicationIdFromUrl),
    [applications, cvId, applicationIdFromUrl],
  );
}
