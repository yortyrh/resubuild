'use client';

import { getValidAccessToken } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface CvRecord {
  id: string;
  user_id: string;
  title: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listCvs() {
  return apiFetch<CvRecord[]>('/cv');
}

export function getCv(id: string) {
  return apiFetch<CvRecord>(`/cv/${id}`);
}

export function createCv(payload: { title?: string; data: Record<string, unknown> }) {
  return apiFetch<CvRecord>('/cv', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCv(id: string, payload: { title?: string; data?: Record<string, unknown> }) {
  return apiFetch<CvRecord>(`/cv/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteCv(id: string) {
  return apiFetch<void>(`/cv/${id}`, { method: 'DELETE' });
}
