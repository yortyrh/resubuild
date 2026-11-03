'use client';

/**
 * Minimal client for the Better Auth endpoints served by the API under
 * `/api/auth/*`. Bearer-token based: when a call creates a session the API
 * returns the token in the `set-auth-token` header (CORS-exposed), and the
 * caller stores it with `saveSessionToken`.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export const AUTH_BASE_URL = `${API_URL}/api/auth`;

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AuthRequestError';
  }
}

export interface AuthResult<T> {
  data: T;
  /** Session token issued by this call (`set-auth-token`), if any. */
  token: string | null;
}

interface AuthRequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  /** Bearer token for endpoints that need the current session. */
  token?: string | null;
}

export async function authRequest<T = Record<string, unknown>>(
  path: string,
  { method = 'POST', body, query, token }: AuthRequestOptions = {},
): Promise<AuthResult<T>> {
  const url = new URL(`${AUTH_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'omit',
  });

  const text = await response.text();
  const data = (text ? JSON.parse(text) : {}) as T & { message?: string; code?: string };

  if (!response.ok) {
    throw new AuthRequestError(
      data?.message || `Request failed (${response.status})`,
      response.status,
      data?.code,
    );
  }

  return { data, token: response.headers.get('set-auth-token') };
}
