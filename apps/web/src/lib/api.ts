'use client';

import type { CvTemplatePresentationConfig } from '@resumind/resume-template';
import { getValidAccessToken } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface CvRecord {
  id: string;
  user_id: string;
  title: string;
  templateId: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CvTemplateMeta {
  id: string;
  label: string;
  description: string;
  category: string;
  capdPage?: number | string;
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

export function updateCv(
  id: string,
  payload: { title?: string; data?: Record<string, unknown>; templateId?: string },
) {
  return apiFetch<CvRecord>(`/cv/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateCvTemplate(id: string, templateId: string) {
  return updateCv(id, { templateId });
}

export function getCvTemplatePresentation(cvId: string, templateId: string) {
  const query = `?template=${encodeURIComponent(templateId)}`;
  return apiFetch<{ templateId: string; config: CvTemplatePresentationConfig }>(
    `/cv/${cvId}/template-presentation${query}`,
  );
}

export function updateCvTemplatePresentation(
  cvId: string,
  templateId: string,
  config: Partial<CvTemplatePresentationConfig>,
) {
  const query = `?template=${encodeURIComponent(templateId)}`;
  return apiFetch<{ templateId: string; config: CvTemplatePresentationConfig }>(
    `/cv/${cvId}/template-presentation${query}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ config }),
    },
  );
}

export function listCvTemplates() {
  return apiFetch<{ templates: CvTemplateMeta[] }>('/cv/export/templates').then((r) => r.templates);
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

export function createAiAgentAccount(payload: { label?: string; modelId: string; apiKey: string }) {
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
  previewData?: Record<string, unknown>;
  errors?: string[];
}

export type WebScrapeProvider = 'firecrawl' | 'tavily';

export interface WebScrapeConfigStatus {
  configured: boolean;
  provider?: WebScrapeProvider;
  reconfigurationRequired?: boolean;
  updatedAt?: string;
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

export async function importCvFromMarkdown(file: File): Promise<{ jobId: string }> {
  const token = await getValidAccessToken(apiUrl);
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiUrl}/cv/import/markdown`, {
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

export async function startImageImport(file: File): Promise<{ jobId: string }> {
  const token = await getValidAccessToken(apiUrl);
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiUrl}/cv/import/image`, {
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

export async function importCvFromDocx(file: File): Promise<{ jobId: string }> {
  const token = await getValidAccessToken(apiUrl);
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiUrl}/cv/import/docx`, {
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
  return apiFetch<Record<string, unknown>>(`/cv/${cvId}/basics`);
}

export function getCvWork(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/work`);
}

export function getCvVolunteer(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/volunteer`);
}

export function getCvEducation(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/education`);
}

export function getCvSkills(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/skills`);
}

export function getCvProjects(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/projects`);
}

export function getCvAwards(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/awards`);
}

export function getCvCertificates(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/certificates`);
}

export function getCvPublications(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/publications`);
}

export function getCvLanguages(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/languages`);
}

export function getCvInterests(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/interests`);
}

export function getCvReferences(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/references`);
}

export function getCvProfiles(cvId: string) {
  return apiFetch<Record<string, unknown>[]>(`/cv/${cvId}/profiles`);
}

export type ImportFromUrlResult =
  | { kind: 'json'; data: Record<string, unknown> }
  | { kind: 'job'; jobId: string };

export async function importCvFromUrl(url: string): Promise<ImportFromUrlResult> {
  return apiFetch<ImportFromUrlResult>('/cv/import/from-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function getWebScrapeConfig() {
  return apiFetch<WebScrapeConfigStatus>('/web-scrape/config');
}

export function saveWebScrapeConfig(payload: { provider: WebScrapeProvider; apiKey: string }) {
  return apiFetch<WebScrapeConfigStatus>('/web-scrape/config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function clearWebScrapeConfig() {
  return apiFetch<WebScrapeConfigStatus>('/web-scrape/config', {
    method: 'DELETE',
  });
}

export async function getCvExportHtml(cvId: string, templateId?: string): Promise<string> {
  const token = await getValidAccessToken(apiUrl);
  const query = templateId ? `?template=${encodeURIComponent(templateId)}` : '';
  const response = await fetch(`${apiUrl}/cv/${cvId}/export/html${query}`, {
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

export async function downloadCvPdf(
  cvId: string,
  templateId?: string,
): Promise<{ blob: Blob; filename: string }> {
  const token = await getValidAccessToken(apiUrl);
  const query = templateId ? `?template=${encodeURIComponent(templateId)}` : '';
  const response = await fetch(`${apiUrl}/cv/${cvId}/export/pdf${query}`, {
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

export async function downloadCvJson(cvId: string): Promise<{ blob: Blob; filename: string }> {
  const token = await getValidAccessToken(apiUrl);
  const response = await fetch(`${apiUrl}/cv/${cvId}/export/json`, {
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

  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(response.headers.get('Content-Disposition')) ?? 'resume.json';
  return { blob, filename };
}

export type JobApplicationStatus = 'queued' | 'running' | 'ready' | 'failed';

export interface JobApplicationSummary {
  id: string;
  status: JobApplicationStatus;
  jobTitle?: string | null;
  jobCompany?: string | null;
  jobSourceType?: string | null;
  sourceCvId?: string | null;
  tailoredCvId?: string | null;
  coverLetter?: string | null;
  coverLetterEmailSubject?: string | null;
  selectionRationale?: string | null;
  userMessage?: string | null;
  intakeSourceCvId?: string | null;
  createdAt: string;
  updatedAt: string;
  progress?: string;
  errors?: string[];
}

export function listApplications() {
  return apiFetch<JobApplicationSummary[]>('/applications');
}

export function getApplication(id: string) {
  return apiFetch<JobApplicationSummary>(`/applications/${id}`);
}

export async function prepareApplication(payload: {
  url?: string;
  text?: string;
  message?: string;
  sourceCvId?: string;
  file?: File;
}) {
  const token = await getValidAccessToken(apiUrl);
  const formData = new FormData();
  if (payload.url) formData.append('url', payload.url);
  if (payload.text) formData.append('text', payload.text);
  if (payload.message) formData.append('message', payload.message);
  if (payload.sourceCvId) formData.append('sourceCvId', payload.sourceCvId);
  if (payload.file) formData.append('file', payload.file);

  const response = await fetch(`${apiUrl}/applications/prepare`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
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

  return response.json() as Promise<{ applicationId: string; status: 'queued' }>;
}

export function updateApplicationLetter(id: string, coverLetter: string) {
  return apiFetch<JobApplicationSummary>(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ coverLetter }),
  });
}

export function updateApplication(id: string, payload: { message?: string; sourceCvId?: string }) {
  return apiFetch<{ applicationId: string; status: 'queued' }>(`/applications/${id}/update`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function cancelApplication(id: string) {
  return apiFetch<JobApplicationSummary>(`/applications/${id}/cancel`, {
    method: 'POST',
  });
}

export function retryApplication(id: string) {
  return apiFetch<{ applicationId: string; status: 'queued' }>(`/applications/${id}/retry`, {
    method: 'POST',
  });
}

export function deleteApplication(id: string) {
  return apiFetch<void>(`/applications/${id}`, { method: 'DELETE' });
}

export function promoteApplicationClone(id: string) {
  return apiFetch<JobApplicationSummary>(`/applications/${id}/promote-clone`, {
    method: 'POST',
  });
}

export async function getApplicationLetterHtml(id: string): Promise<string> {
  const token = await getValidAccessToken(apiUrl);
  const response = await fetch(`${apiUrl}/applications/${id}/export/letter/html`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.text();
}

export async function downloadApplicationLetterPdf(
  id: string,
): Promise<{ blob: Blob; filename: string }> {
  const token = await getValidAccessToken(apiUrl);
  const response = await fetch(`${apiUrl}/applications/${id}/export/letter/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message =
      response.status === 503
        ? 'PDF export is temporarily unavailable.'
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(response.headers.get('Content-Disposition')) ??
    'cover-letter.pdf';
  return { blob, filename };
}
