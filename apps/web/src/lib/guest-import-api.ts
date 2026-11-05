/**
 * Anonymous calls of the free import wizard (`/public/import/*`): no session
 * token. The guest token returned when a job starts is the only way to read it.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface GuestImportStatus {
  enabled: boolean;
  turnstileSiteKey?: string;
}

export interface GuestImportJob {
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress?: string;
  previewData?: Record<string, unknown>;
  errors?: string[];
}

export type GuestImportStart =
  | { kind: 'job'; jobId: string; guestToken: string }
  | { kind: 'json'; data: Record<string, unknown> };

/** Error with the API's HTTP status and optional `code` (e.g. GUEST_IMPORT_UNAVAILABLE). */
export class GuestImportError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'GuestImportError';
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
      code?: string;
    };
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(', ')
          : `Request failed (${response.status})`;
    throw new GuestImportError(message, response.status, body.code);
  }
  return (await response.json()) as T;
}

export async function getGuestImportStatus(): Promise<GuestImportStatus> {
  try {
    const response = await fetch(`${apiUrl}/public/import/status`);
    return await readJson<GuestImportStatus>(response);
  } catch {
    return { enabled: false };
  }
}

function challengeHeaders(turnstileToken?: string): Record<string, string> {
  return turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {};
}

export async function startGuestFileImport(
  file: File,
  turnstileToken?: string,
): Promise<GuestImportStart> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${apiUrl}/public/import/file`, {
    method: 'POST',
    headers: challengeHeaders(turnstileToken),
    body: formData,
  });
  const { jobId, guestToken } = await readJson<{ jobId: string; guestToken: string }>(response);
  return { kind: 'job', jobId, guestToken };
}

export async function startGuestUrlImport(
  url: string,
  turnstileToken?: string,
): Promise<GuestImportStart> {
  const response = await fetch(`${apiUrl}/public/import/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...challengeHeaders(turnstileToken) },
    body: JSON.stringify({ url }),
  });
  return readJson<GuestImportStart>(response);
}

export async function getGuestImportJob(
  jobId: string,
  guestToken: string,
): Promise<GuestImportJob> {
  const response = await fetch(`${apiUrl}/public/import/jobs/${encodeURIComponent(jobId)}`, {
    headers: { 'x-guest-import-token': guestToken },
  });
  return readJson<GuestImportJob>(response);
}
