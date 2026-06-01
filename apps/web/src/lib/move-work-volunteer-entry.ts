import type { ResumeWork } from '@resumind/types';
import { sanitizeResumeItemPayload } from '@resumind/types';
import type { QueryClient } from '@tanstack/react-query';
import { cvVolunteerApi, cvWorkApi } from '@/lib/cv-item-api';
import { invalidateCvSection } from '@/lib/queries/cv-mutations';
import type { CvArraySectionKey } from '@/lib/queries/cv-queries';
import {
  mapVolunteerToWork,
  mapWorkToVolunteer,
  type VolunteerMoveSource,
} from '@/lib/work-volunteer-move';

export type WorkVolunteerMoveDirection = 'work-to-volunteer' | 'volunteer-to-work';

const TARGET_SECTION: Record<WorkVolunteerMoveDirection, CvArraySectionKey> = {
  'work-to-volunteer': 'volunteer',
  'volunteer-to-work': 'work',
};

const SOURCE_SECTION: Record<WorkVolunteerMoveDirection, CvArraySectionKey> = {
  'work-to-volunteer': 'work',
  'volunteer-to-work': 'volunteer',
};

export async function moveWorkVolunteerEntry(
  queryClient: QueryClient,
  cvId: string,
  direction: WorkVolunteerMoveDirection,
  sourceItem: ResumeWork | VolunteerMoveSource,
  sourceId: string,
): Promise<void> {
  const createApi = direction === 'work-to-volunteer' ? cvVolunteerApi : cvWorkApi;
  const deleteApi = direction === 'work-to-volunteer' ? cvWorkApi : cvVolunteerApi;
  const payload =
    direction === 'work-to-volunteer'
      ? mapWorkToVolunteer(sourceItem as ResumeWork)
      : mapVolunteerToWork(sourceItem as VolunteerMoveSource);

  await createApi.create(cvId, sanitizeResumeItemPayload(payload));

  try {
    await deleteApi.delete(cvId, sourceId);
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.message}. A duplicate entry may exist in the destination section.`
        : 'Move partially failed. A duplicate entry may exist in the destination section.';
    throw new Error(message);
  }

  await Promise.all([
    invalidateCvSection(queryClient, cvId, TARGET_SECTION[direction]),
    invalidateCvSection(queryClient, cvId, SOURCE_SECTION[direction]),
  ]);
}
