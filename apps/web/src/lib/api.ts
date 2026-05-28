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
    const body = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
      errors?: string[];
    };
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(', ')
          : `Request failed (${response.status})`;
    const details =
      Array.isArray(body.errors) && body.errors.length > 0 ? body.errors.join('\n') : '';
    throw new Error(details ? `${message}\n${details}` : message);
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

const inflightGetRequests = new Map<string, Promise<unknown>>();

function dedupeGetRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  const existing = inflightGetRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = request().finally(() => {
    inflightGetRequests.delete(key);
  });
  inflightGetRequests.set(key, promise);
  return promise;
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

/** Public preview URL for owned media (≤150×150 derivative). */
export function thumbnailUrlForMediaId(mediaId: string): string {
  return `${apiUrl}/media/${mediaId}/thumbnail`;
}

/** Full original upload URL (for crop editor; coordinates are in original-image space). */
export function originalUrlForMediaId(mediaId: string): string {
  return `${apiUrl}/media/${mediaId}/original`;
}

/** Profile photo preview src: thumbnail for owned media, full URL otherwise. */
export function profilePhotoPreviewUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;
  const mediaId = parseMediaIdFromImageUrl(imageUrl);
  return mediaId ? thumbnailUrlForMediaId(mediaId) : imageUrl;
}

export function listCvs() {
  return dedupeGetRequest('GET /cv', () => apiFetch<CvRecord[]>('/cv'));
}

export function getCv(id: string) {
  return dedupeGetRequest(`GET /cv/${id}`, () => apiFetch<CvRecord>(`/cv/${id}`));
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

export interface AiAgentProvider {
  id: string;
  displayName: string;
  apiKeyEnvVar: string;
  apiKeyLabel: string;
}

export interface AiAgentModel {
  id: string;
  displayName: string;
  recommendedForPdfImport: boolean;
}

export interface AiAgentAccount {
  id: string;
  label: string | null;
  providerId: string;
  modelId: string;
  isActive: boolean;
  reconfigurationRequired?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiAgentActiveStatus {
  configured: boolean;
  accountId?: string;
  label?: string | null;
  providerId?: string;
  modelId?: string;
  configuredAt?: string;
  reconfigurationRequired?: boolean;
}

/** @deprecated Use AiAgentProvider */
export type ImportLlmProvider = AiAgentProvider;

/** @deprecated Use AiAgentModel */
export type ImportLlmModel = AiAgentModel;

/** @deprecated Use AiAgentActiveStatus */
export type ImportLlmConfigStatus = AiAgentActiveStatus;

export function getAiAgentProviders() {
  return apiFetch<AiAgentProvider[]>('/ai/agents/providers');
}

export function getAiAgentModels(providerId: string) {
  return apiFetch<AiAgentModel[]>(`/ai/agents/providers/${providerId}/models`);
}

export function getAiAgentAccounts() {
  return apiFetch<AiAgentAccount[]>('/ai/agents/accounts');
}

export function createAiAgentAccount(payload: {
  label?: string;
  modelId: string;
  apiKey: string;
}) {
  return apiFetch<AiAgentAccount>('/ai/agents/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAiAgentAccount(
  id: string,
  payload: {
    label?: string;
    modelId?: string;
    apiKey?: string;
    keepExistingApiKey?: boolean;
  },
) {
  return apiFetch<AiAgentAccount>(`/ai/agents/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAiAgentAccount(id: string) {
  return apiFetch<void>(`/ai/agents/accounts/${id}`, { method: 'DELETE' });
}

export function getAiAgentActive() {
  return apiFetch<AiAgentActiveStatus>('/ai/agents/active');
}

export function setAiAgentActive(accountId: string) {
  return apiFetch<AiAgentActiveStatus>('/ai/agents/active', {
    method: 'PUT',
    body: JSON.stringify({ accountId }),
  });
}

export function getImportLlmProviders() {
  return getAiAgentProviders();
}

export function getImportLlmModels(providerId: string) {
  return getAiAgentModels(providerId);
}

export function getImportLlmConfig() {
  return getAiAgentActive();
}

export function saveImportLlmConfig(payload: {
  modelId: string;
  apiKey?: string;
  keepExistingApiKey?: boolean;
}) {
  return apiFetch<ImportLlmConfigStatus>('/import/llm/config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export interface PdfImportJobStatus {
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress?: string;
  cvId?: string;
  errors?: string[];
}

export async function startPdfImport(file: File): Promise<{ jobId: string }> {
  const token = await getValidAccessToken(apiUrl);
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiUrl}/cv/import/pdf`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(', ')
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json() as Promise<{ jobId: string }>;
}

export function getPdfImportJob(jobId: string) {
  return apiFetch<PdfImportJobStatus>(`/cv/import/${jobId}`);
}

export function getCvBasics(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/basics`, () =>
    apiFetch<Record<string, unknown>>(`/cv/${cvId}/basics`),
  );
}

export function getCvWork(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/work`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/work`),
  );
}

export function getCvVolunteer(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/volunteer`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/volunteer`),
  );
}

export function getCvEducation(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/education`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/education`),
  );
}

export function getCvSkills(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/skills`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/skills`),
  );
}

export function getCvProjects(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/projects`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/projects`),
  );
}

export function getCvAwards(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/awards`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/awards`),
  );
}

export function getCvCertificates(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/certificates`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/certificates`),
  );
}

export function getCvPublications(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/publications`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/publications`),
  );
}

export function getCvLanguages(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/languages`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/languages`),
  );
}

export function getCvInterests(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/interests`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/interests`),
  );
}

export function getCvReferences(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/references`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/references`),
  );
}

export function getCvProfiles(cvId: string) {
  return dedupeGetRequest(`GET /cv/${cvId}/profiles`, () =>
    apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/profiles`),
  );
}

export async function getCvExportHtml(cvId: string): Promise<string> {
  const token = await getValidAccessToken(apiUrl);
  const response = await fetch(`${apiUrl}/cv/${cvId}/export/html`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(', ')
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return response.text();
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="([^"]+)"/i);
  return match?.[1] ?? null;
}

export async function downloadCvPdf(cvId: string): Promise<{ blob: Blob; filename: string }> {
  const token = await getValidAccessToken(apiUrl);
  const response = await fetch(`${apiUrl}/cv/${cvId}/export/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(', ')
          : response.status === 503
            ? 'PDF export is temporarily unavailable. Try Print instead.'
            : `Request failed (${response.status})`;
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(response.headers.get('Content-Disposition')) ?? 'resume.pdf';
  return { blob, filename };
}
