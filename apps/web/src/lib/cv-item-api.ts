'use client';

import { getValidAccessToken } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface CvItemMutationResponse {
  version: string;
  index?: number;
  parentIndex?: number;
  childIndex?: number;
  item?: unknown;
  value?: string;
}

interface VersionedPayload {
  version?: string;
}

async function itemFetch<T>(path: string, options: RequestInit & { method: string }): Promise<T> {
  const token = await getValidAccessToken(apiUrl);

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(', ')
          : response.status === 409
            ? 'This CV was modified elsewhere. Reload the page and try again.'
            : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function withVersion(version?: string): VersionedPayload {
  return version ? { version } : {};
}

export function patchCvBasics(cvId: string, basics: Record<string, unknown>, version?: string) {
  return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/basics`, {
    method: 'PATCH',
    body: JSON.stringify({ basics, ...withVersion(version) }),
  });
}

export function createCvProfile(cvId: string, profile: Record<string, unknown>, version?: string) {
  return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/profiles`, {
    method: 'POST',
    body: JSON.stringify({ profile, ...withVersion(version) }),
  });
}

export function updateCvProfile(
  cvId: string,
  index: number,
  profile: Record<string, unknown>,
  version?: string,
) {
  return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/profiles/${index}`, {
    method: 'PATCH',
    body: JSON.stringify({ profile, ...withVersion(version) }),
  });
}

export function deleteCvProfile(cvId: string, index: number, version?: string) {
  return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/profiles/${index}`, {
    method: 'DELETE',
    body: JSON.stringify(withVersion(version)),
  });
}

function arrayCrud(segment: string, entityKey: string) {
  return {
    create(cvId: string, item: Record<string, unknown>, version?: string) {
      return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/${segment}`, {
        method: 'POST',
        body: JSON.stringify({ [entityKey]: item, ...withVersion(version) }),
      });
    },
    update(cvId: string, index: number, item: Record<string, unknown>, version?: string) {
      return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/${segment}/${index}`, {
        method: 'PATCH',
        body: JSON.stringify({ [entityKey]: item, ...withVersion(version) }),
      });
    },
    delete(cvId: string, index: number, version?: string) {
      return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/${segment}/${index}`, {
        method: 'DELETE',
        body: JSON.stringify(withVersion(version)),
      });
    },
  };
}

export const cvWorkApi = arrayCrud('work', 'work');
export const cvVolunteerApi = arrayCrud('volunteer', 'volunteer');
export const cvEducationApi = arrayCrud('education', 'education');
export const cvSkillApi = arrayCrud('skills', 'skill');
export const cvProjectApi = arrayCrud('projects', 'project');
export const cvAwardApi = arrayCrud('awards', 'award');
export const cvCertificateApi = arrayCrud('certificates', 'certificate');
export const cvPublicationApi = arrayCrud('publications', 'publication');
export const cvLanguageApi = arrayCrud('languages', 'language');
export const cvInterestApi = arrayCrud('interests', 'interest');
export const cvReferenceApi = arrayCrud('references', 'reference');

function nestedStringCrud(parentSegment: string, parentIndexParam: string, childSegment: string) {
  return {
    create(cvId: string, parentIndex: number, value: string, version?: string) {
      return itemFetch<CvItemMutationResponse>(
        `/cv/${cvId}/${parentSegment}/${parentIndex}/${childSegment}`,
        {
          method: 'POST',
          body: JSON.stringify({ value, ...withVersion(version) }),
        },
      );
    },
    update(cvId: string, parentIndex: number, childIndex: number, value: string, version?: string) {
      return itemFetch<CvItemMutationResponse>(
        `/cv/${cvId}/${parentSegment}/${parentIndex}/${childSegment}/${childIndex}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ value, ...withVersion(version) }),
        },
      );
    },
    delete(cvId: string, parentIndex: number, childIndex: number, version?: string) {
      return itemFetch<CvItemMutationResponse>(
        `/cv/${cvId}/${parentSegment}/${parentIndex}/${childSegment}/${childIndex}`,
        {
          method: 'DELETE',
          body: JSON.stringify(withVersion(version)),
        },
      );
    },
  };
}

export const cvWorkHighlightApi = nestedStringCrud('work', 'workIndex', 'highlights');
export const cvVolunteerHighlightApi = nestedStringCrud(
  'volunteer',
  'volunteerIndex',
  'highlights',
);
export const cvEducationCourseApi = nestedStringCrud('education', 'educationIndex', 'courses');
export const cvProjectHighlightApi = nestedStringCrud('projects', 'projectIndex', 'highlights');
