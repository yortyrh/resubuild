'use client';

import { getValidAccessToken } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface CvItemMutationResponse {
  item?: unknown;
  items?: unknown[];
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
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function patchCvBasics(cvId: string, basics: Record<string, unknown>) {
  return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/basics`, {
    method: 'PATCH',
    body: JSON.stringify({ basics }),
  });
}

export function createCvProfile(cvId: string, profile: Record<string, unknown>) {
  return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/profiles`, {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });
}

export function updateCvProfile(cvId: string, itemId: string, profile: Record<string, unknown>) {
  return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/profiles/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ profile }),
  });
}

export function deleteCvProfile(cvId: string, itemId: string) {
  return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/profiles/${itemId}`, {
    method: 'DELETE',
  });
}

function arrayCrud(segment: string, entityKey: string) {
  return {
    create(cvId: string, item: Record<string, unknown>) {
      return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/${segment}`, {
        method: 'POST',
        body: JSON.stringify({ [entityKey]: item }),
      });
    },
    update(cvId: string, itemId: string, item: Record<string, unknown>) {
      return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/${segment}/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [entityKey]: item }),
      });
    },
    delete(cvId: string, itemId: string) {
      return itemFetch<CvItemMutationResponse>(`/cv/${cvId}/${segment}/${itemId}`, {
        method: 'DELETE',
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
