// @vitest-environment node
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

import { GET } from './route';

function makeRequest(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

describe('/auth/callback route handler', () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
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
});
