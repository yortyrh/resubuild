import { type MediaUploadResult, parseMediaIdFromImageUrl } from '@/lib/api';
import { getValidAccessToken } from '@/lib/auth-session';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function postImportEndpoint<T>(
  path: string,
  body: Record<string, string>,
): Promise<T | null> {
  const token = await getValidAccessToken(apiUrl);
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
      errors?: string[];
    };
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : Array.isArray(payload.message)
          ? payload.message.join(', ')
          : `Request failed (${response.status})`;
    const details =
      Array.isArray(payload.errors) && payload.errors.length > 0 ? payload.errors.join('\n') : '';
    throw new Error(details ? `${message}\n${details}` : message);
  }

  return (await response.json()) as T;
}

/**
 * Imports a remote image into owned media when the URL is reachable.
 * Returns null when the image does not exist or is not a supported type.
 */
export async function tryImportMediaFromUrl(url: string): Promise<MediaUploadResult | null> {
  return postImportEndpoint<MediaUploadResult>('/media/import-url', { url });
}

/** Server-side importability check (SSRF host rules, DNS, image type). Does not upload. */
export async function checkImportableMediaUrl(url: string): Promise<boolean> {
  const token = await getValidAccessToken(apiUrl);
  const response = await fetch(`${apiUrl}/media/import-url/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    return false;
  }

  const body = (await response.json()) as { importable?: boolean };
  return body.importable === true;
}

/**
 * Imports a Gravatar for the email when one exists.
 * Returns null when there is no Gravatar or the email is invalid.
 */
export async function tryImportGravatarFromEmail(email: string): Promise<MediaUploadResult | null> {
  const trimmed = email.trim();
  if (!trimmed) {
    return null;
  }
  return postImportEndpoint<MediaUploadResult>('/media/import-gravatar', { email: trimmed });
}

function omitBasicsImage(basics: Record<string, unknown>): Record<string, unknown> {
  const { image: _image, ...rest } = basics;
  return rest;
}

export interface ResolveImportedResumeOptions {
  /** When true, import Gravatar from basics.email (user opted in on the import form). */
  useGravatar?: boolean;
}

async function resolveBasicsProfileImage(
  basicsRecord: Record<string, unknown>,
  options: ResolveImportedResumeOptions,
): Promise<Record<string, unknown>> {
  const image = typeof basicsRecord.image === 'string' ? basicsRecord.image.trim() : '';
  const email = typeof basicsRecord.email === 'string' ? basicsRecord.email.trim() : '';

  if (image && parseMediaIdFromImageUrl(image)) {
    return basicsRecord;
  }

  if (image) {
    const imported = await tryImportMediaFromUrl(image);
    if (imported) {
      return { ...basicsRecord, image: imported.url };
    }
  }

  if (options.useGravatar && email) {
    const gravatar = await tryImportGravatarFromEmail(email);
    if (gravatar) {
      return { ...basicsRecord, image: gravatar.url };
    }
  }

  return omitBasicsImage(basicsRecord);
}

/**
 * Resolves basics.image: import external URL when present; optional Gravatar when requested.
 */
export async function resolveImportedResumeData(
  data: Record<string, unknown>,
  options: ResolveImportedResumeOptions = {},
): Promise<Record<string, unknown>> {
  const basics = data.basics;
  if (!basics || typeof basics !== 'object' || Array.isArray(basics)) {
    return data;
  }

  const basicsRecord = { ...(basics as Record<string, unknown>) };
  const resolvedBasics = await resolveBasicsProfileImage(basicsRecord, options);
  return { ...data, basics: resolvedBasics };
}
