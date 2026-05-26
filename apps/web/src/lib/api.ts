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

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export interface MediaUploadResult {
  /** Opaque media id (UUID v4). */
  id: string;
  /** Absolute URL on this API (`GET /media/:id`) for use in Markdown or `basics.image`. */
  url: string;
  contentType: string;
}

/** Multipart POST to authenticated `/media/upload`; returns API-hosted image URL keyed by media id. */
export async function uploadResumeMedia(file: File): Promise<MediaUploadResult> {
  const token = await getValidAccessToken(apiUrl);

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiUrl}/media/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(', ')
          : `Upload failed (${response.status})`;
    throw new Error(message);
  }

  return response.json() as Promise<MediaUploadResult>;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MediaMetaResult {
  id: string;
  contentType: string;
  crop: CropRect | null;
  hasCropped: boolean;
}

/** Apply a crop rectangle to an uploaded media file; returns updated media URL. */
export function patchMediaCrop(id: string, crop: CropRect): Promise<MediaUploadResult> {
  return apiFetch<MediaUploadResult>(`/media/${id}/crop`, {
    method: 'PATCH',
    body: JSON.stringify(crop),
  });
}

/** Delete an owned media entry (original + cropped storage objects + registry row). */
export function deleteMedia(id: string): Promise<void> {
  return apiFetch<void>(`/media/${id}`, { method: 'DELETE' });
}

/** Load crop metadata for the edit-crop UI. Owner-only. */
export function getMediaMeta(id: string): Promise<MediaMetaResult> {
  return apiFetch<MediaMetaResult>(`/media/${id}/meta`);
}

/**
 * Extract media UUID from a `/media/{uuid}` URL when it matches the API pattern.
 * Returns `null` for external URLs.
 */
export function parseMediaIdFromImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /\/media\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:[/?#]|$)/i,
  );
  return match ? match[1] : null;
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
