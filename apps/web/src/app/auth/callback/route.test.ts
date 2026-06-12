// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockExchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

import { GET } from './route';

const APP_URL_ENV = 'NEXT_PUBLIC_APP_URL';
const ORIGINAL_APP_URL = process.env[APP_URL_ENV];

function setAppUrl(value: string | undefined): void {
  if (value === undefined) {
    delete process.env[APP_URL_ENV];
  } else {
    process.env[APP_URL_ENV] = value;
  }
}

function makeRequest(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

describe('/auth/callback route handler', () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
  });

  afterEach(() => {
    setAppUrl(ORIGINAL_APP_URL);
  });

  it('exchanges the code and redirects to /dashboard on success', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const request = makeRequest('https://app.example.com/auth/callback?code=abc123');

    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.com/dashboard');
  });

  it('exchanges the GitHub-issued code via the same code path (no provider branching)', async () => {
    // GitHub OAuth (supabase.auth.signInWithOAuth({ provider: 'github' }))
    // round-trips through the same PKCE code query param as the magic
    // link. The handler MUST be provider-agnostic so the new GitHub
    // flow reuses this exact route — see auth-github-oauth spec.
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const request = makeRequest('https://app.example.com/auth/callback?code=github_code_xyz');

    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('github_code_xyz');
    expect(response.headers.get('location')).toBe('https://app.example.com/dashboard');
  });

  it('exchanges the Google-issued code via the same code path (no provider branching)', async () => {
    // Google OAuth (supabase.auth.signInWithOAuth({ provider: 'google' }))
    // round-trips through the same PKCE code query param as the magic
    // link and GitHub. The handler MUST be provider-agnostic so the
    // Google flow reuses this exact route — see auth-google-oauth spec.
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const request = makeRequest('https://app.example.com/auth/callback?code=google_code_xyz');

    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('google_code_xyz');
    expect(response.headers.get('location')).toBe('https://app.example.com/dashboard');
  });

  it('honors a safe same-origin ?next= after a successful exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const request = makeRequest(
      'https://app.example.com/auth/callback?code=abc&next=/dashboard/onboarding',
    );

    const response = await GET(request);

    expect(response.headers.get('location')).toBe('https://app.example.com/dashboard/onboarding');
  });

  it('ignores an absolute ?next= to block open-redirect attacks', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const request = makeRequest(
      'https://app.example.com/auth/callback?code=abc&next=https://attacker.example/foo',
    );

    const response = await GET(request);

    expect(response.headers.get('location')).toBe('https://app.example.com/dashboard');
  });

  it('ignores a protocol-relative ?next= to block open-redirect attacks', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const request = makeRequest(
      'https://app.example.com/auth/callback?code=abc&next=//attacker.example',
    );

    const response = await GET(request);

    expect(response.headers.get('location')).toBe('https://app.example.com/dashboard');
  });

  it('redirects to /login with provider error params when Supabase forwarded an error', async () => {
    // No code, but Supabase itself routed us here after a provider failure
    // (e.g. user denied authorization on GitHub). The handler must surface
    // the existing error code/description to the login page.
    const request = makeRequest(
      'https://app.example.com/auth/callback' +
        '?error=server_error' +
        '&error_code=unexpected_failure' +
        '&error_description=Error+getting+user+profile+from+external+provider',
    );

    const response = await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBeTruthy();
    const url = new URL(location!);
    expect(url.origin).toBe('https://app.example.com');
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('error')).toBe('server_error');
    expect(url.searchParams.get('error_code')).toBe('unexpected_failure');
    expect(url.searchParams.get('error_description')).toBe(
      'Error getting user profile from external provider',
    );
  });

  it('redirects to /login with the SDK error code/description on exchange failure', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: {
        message: 'PKCE code verifier not found in storage.',
        code: 'pkce_code_verifier_not_found',
        status: 400,
      },
    });
    const request = makeRequest('https://app.example.com/auth/callback?code=stale');

    const response = await GET(request);

    expect(response.status).toBe(307);
    const url = new URL(response.headers.get('location')!);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('error_code')).toBe('pkce_code_verifier_not_found');
    expect(url.searchParams.get('error_description')).toBe(
      'PKCE code verifier not found in storage.',
    );
  });

  it('falls back to "exchange_failed" when the SDK error has no code', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Unknown failure', code: undefined, status: 500 },
    });
    const request = makeRequest('https://app.example.com/auth/callback?code=abc');

    const response = await GET(request);

    const url = new URL(response.headers.get('location')!);
    expect(url.searchParams.get('error')).toBe('exchange_failed');
    expect(url.searchParams.get('error_code')).toBe('exchange_failed');
    expect(url.searchParams.get('error_description')).toBe('Unknown failure');
  });

  it('redirects to /login with a missing_code error when the URL is malformed', async () => {
    const request = makeRequest('https://app.example.com/auth/callback');

    const response = await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    const url = new URL(response.headers.get('location')!);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('error')).toBe('missing_code');
    expect(url.searchParams.get('error_description')).toMatch(/missing the authorization code/);
  });

  // -----------------------------------------------------------------------
  // NEXT_PUBLIC_APP_URL server-side redirect behavior
  // -----------------------------------------------------------------------
  // In production (Docker container behind a reverse proxy) the request
  // hits the Next.js server via the internal container address (e.g.
  // http://localhost:8080). The route must redirect to the public origin
  // baked in via NEXT_PUBLIC_APP_URL, not the internal origin — otherwise
  // the browser's address bar shows http://localhost:8080/dashboard and
  // users can't bookmark or share the URL they actually signed in at.

  it('redirects to NEXT_PUBLIC_APP_URL after a successful exchange (production redirect bug fix)', async () => {
    setAppUrl('https://app.resubuild.dev');
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    // Simulate a request that hit the Docker internal port — the public
    // origin should still win.
    const request = makeRequest('http://localhost:8080/auth/callback?code=abc123');

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.resubuild.dev/dashboard');
  });

  it('redirects to NEXT_PUBLIC_APP_URL when the SDK exchange fails (production redirect bug fix)', async () => {
    setAppUrl('https://app.resubuild.dev');
    mockExchangeCodeForSession.mockResolvedValue({
      error: {
        message: 'PKCE code verifier not found in storage.',
        code: 'pkce_code_verifier_not_found',
        status: 400,
      },
    });
    const request = makeRequest('http://localhost:8080/auth/callback?code=stale');

    const response = await GET(request);

    const url = new URL(response.headers.get('location')!);
    expect(url.origin).toBe('https://app.resubuild.dev');
    expect(url.pathname).toBe('/login');
  });

  it('redirects to NEXT_PUBLIC_APP_URL when the provider forwards an error (production redirect bug fix)', async () => {
    setAppUrl('https://app.resubuild.dev');
    const request = makeRequest(
      'http://localhost:8080/auth/callback' +
        '?error=server_error' +
        '&error_code=unexpected_failure' +
        '&error_description=oops',
    );

    const response = await GET(request);

    const url = new URL(response.headers.get('location')!);
    expect(url.origin).toBe('https://app.resubuild.dev');
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('error')).toBe('server_error');
  });

  it('redirects to NEXT_PUBLIC_APP_URL when the callback URL is malformed (production redirect bug fix)', async () => {
    setAppUrl('https://app.resubuild.dev');
    const request = makeRequest('http://localhost:8080/auth/callback');

    const response = await GET(request);

    const url = new URL(response.headers.get('location')!);
    expect(url.origin).toBe('https://app.resubuild.dev');
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('error')).toBe('missing_code');
  });

  it('falls back to the request origin when NEXT_PUBLIC_APP_URL is unset (local dev)', async () => {
    setAppUrl(undefined);
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const request = makeRequest('http://localhost:3000/auth/callback?code=abc123');

    const response = await GET(request);

    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('honors a same-origin ?next= against NEXT_PUBLIC_APP_URL (production redirect bug fix)', async () => {
    setAppUrl('https://app.resubuild.dev');
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const request = makeRequest(
      'http://localhost:8080/auth/callback?code=abc&next=/dashboard/onboarding',
    );

    const response = await GET(request);

    expect(response.headers.get('location')).toBe('https://app.resubuild.dev/dashboard/onboarding');
  });
});
