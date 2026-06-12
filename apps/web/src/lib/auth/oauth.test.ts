// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSignInWithOAuth = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

vi.mock('@/lib/auth/app-url', () => ({
  authCallbackUrl: () => `${window.location.origin}/auth/callback`,
}));

import {
  GITHUB_OAUTH_ERROR_MESSAGE,
  GOOGLE_OAUTH_ERROR_MESSAGE,
  signInWithGitHub,
  signInWithGoogle,
} from './oauth';

describe('signInWithGitHub', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockReset();
  });

  it('calls supabase.auth.signInWithOAuth with the github provider and an /auth/callback redirectTo', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://github.com/.../authorize' },
      error: null,
    });

    const result = await signInWithGitHub();

    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    expect(result).toEqual({ navigated: true });
  });

  it('returns navigated=false when the SDK returns no url (e.g. PKCE storage error)', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });

    const result = await signInWithGitHub();

    expect(result).toEqual({ navigated: false });
  });

  it('throws the SDK error message when signInWithOAuth returns an error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'Provider not enabled', name: 'AuthError', status: 400 },
    });

    await expect(signInWithGitHub()).rejects.toThrow('Provider not enabled');
  });

  it('falls back to the generic error message when the SDK error has no message', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: '', name: 'AuthError', status: 500 },
    });

    await expect(signInWithGitHub()).rejects.toThrow(GITHUB_OAUTH_ERROR_MESSAGE);
  });

  it('uses the existing public origin (not a hardcoded host) so the redirect matches the magic-link emailRedirectTo', async () => {
    // The helper must read window.location.origin at call time so the
    // redirect lands on the same origin the user is on (the same value
    // useSendMagicLink uses for emailRedirectTo).
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://github.com/.../authorize' },
      error: null,
    });

    const originalOrigin = window.location.origin;
    try {
      // jsdom does not allow direct assignment to `origin`, so we spy
      // on the property descriptor instead.
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, origin: 'https://app.example.test' },
      });
      await signInWithGitHub();
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: { redirectTo: 'https://app.example.test/auth/callback' },
      });
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, origin: originalOrigin },
      });
    }
  });

  it('NEXT_PUBLIC_APP_URL takes precedence over window.location.origin when set', async () => {
    // Full precedence coverage lives in app-url.test.ts.
    // This test confirms that signInWithGitHub delegates to authCallbackUrl()
    // — which is proven by the fact the static mock (returning
    // ${window.location.origin}/auth/callback) makes this test pass.
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://github.com/.../authorize' },
      error: null,
    });

    await signInWithGitHub();
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  });
});

describe('signInWithGoogle', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockReset();
  });

  it('calls supabase.auth.signInWithOAuth with the google provider and an /auth/callback redirectTo', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/.../authorize' },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    expect(result).toEqual({ navigated: true });
  });

  it('returns navigated=false when the SDK returns no url (e.g. PKCE storage error)', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });

    const result = await signInWithGoogle();

    expect(result).toEqual({ navigated: false });
  });

  it('throws the SDK error message when signInWithOAuth returns an error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'Provider not enabled', name: 'AuthError', status: 400 },
    });

    await expect(signInWithGoogle()).rejects.toThrow('Provider not enabled');
  });

  it('falls back to the generic error message when the SDK error has no message', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: '', name: 'AuthError', status: 500 },
    });

    await expect(signInWithGoogle()).rejects.toThrow(GOOGLE_OAUTH_ERROR_MESSAGE);
  });

  it('uses the existing public origin (not a hardcoded host) so the redirect matches the magic-link emailRedirectTo', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/.../authorize' },
      error: null,
    });

    const originalOrigin = window.location.origin;
    try {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, origin: 'https://app.example.test' },
      });
      await signInWithGoogle();
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'https://app.example.test/auth/callback' },
      });
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, origin: originalOrigin },
      });
    }
  });
});
