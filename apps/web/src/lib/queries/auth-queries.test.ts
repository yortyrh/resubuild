// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockFetchAuthMe = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchAuthMe: (...args: unknown[]) => mockFetchAuthMe(...args),
}));

const mockAuthRequest = vi.fn();
const mockGetSessionToken = vi.fn();
const mockClearSession = vi.fn();

vi.mock('@/lib/auth/client', () => ({
  authRequest: (...args: unknown[]) => mockAuthRequest(...args),
}));

vi.mock('@/lib/auth-session', () => ({
  getSessionToken: () => mockGetSessionToken(),
  clearSession: () => mockClearSession(),
}));

import * as featuresModule from '@/lib/auth/features';
import { useAuthFeatures, useAuthMe, useAuthSession } from '@/lib/queries/auth-queries';
import { renderHookWithQueryClient } from '@/lib/queries/test-utils';

describe('auth query hooks', () => {
  describe('useAuthFeatures', () => {
    it('returns the auth features from initialData synchronously (no loading, no network round-trip)', async () => {
      // With initialData the query is immediately successful — data is
      // available on the very first render without any async gap or layout shift.
      const { result } = renderHookWithQueryClient(() => useAuthFeatures());

      // No waitFor needed — data is synchronous with initialData
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual({
        forgot_password: false,
        email_verification: false,
        passwordless: false,
        github_oauth: false,
        google_oauth: false,
        linkedin_oauth: false,
      });
    });

    it('does not fetch when disabled — uses initialData synchronously', () => {
      const getAuthFeaturesSpy = vi.spyOn(featuresModule, 'getAuthFeatures').mockReturnValue({
        forgot_password: true,
        email_verification: false,
        passwordless: true,
        github_oauth: false,
        google_oauth: false,
        linkedin_oauth: false,
      });

      try {
        const { result } = renderHookWithQueryClient(() => useAuthFeatures({ enabled: false }));

        // With initialData, data is available synchronously — no loading state,
        // no network round-trip, no layout shift.
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual({
          forgot_password: true,
          email_verification: false,
          passwordless: true,
          github_oauth: false,
          google_oauth: false,
          linkedin_oauth: false,
        });
        expect(getAuthFeaturesSpy).toHaveBeenCalled();
      } finally {
        getAuthFeaturesSpy.mockRestore();
      }
    });
  });

  describe('useAuthSession', () => {
    const NO_SESSION = { exists: false, userId: null, email: null, emailVerified: false };

    it('returns exists:false without calling the API when no token is stored', async () => {
      mockGetSessionToken.mockReturnValue(null);
      const { result } = renderHookWithQueryClient(() => useAuthSession());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(NO_SESSION);
      expect(mockAuthRequest).not.toHaveBeenCalled();
    });

    it('resolves the stored token against /get-session', async () => {
      mockGetSessionToken.mockReturnValue('tok-abc');
      mockAuthRequest.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com', emailVerified: true } },
        token: null,
      });

      const { result } = renderHookWithQueryClient(() => useAuthSession());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/get-session', {
        method: 'GET',
        token: 'tok-abc',
      });
      expect(result.current.data).toEqual({
        exists: true,
        userId: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      });
    });

    it('clears a revoked or unknown token', async () => {
      mockGetSessionToken.mockReturnValue('tok-old');
      mockAuthRequest.mockResolvedValueOnce({ data: null, token: null });

      const first = renderHookWithQueryClient(() => useAuthSession());
      await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
      expect(first.result.current.data).toEqual(NO_SESSION);

      mockAuthRequest.mockRejectedValueOnce(
        Object.assign(new Error('Unauthorized'), { status: 401 }),
      );
      const second = renderHookWithQueryClient(() => useAuthSession());
      await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
      expect(second.result.current.data).toEqual(NO_SESSION);
      expect(mockClearSession).toHaveBeenCalledTimes(2);
    });

    it('surfaces network errors without clearing the token', async () => {
      mockGetSessionToken.mockReturnValue('tok');
      mockAuthRequest.mockRejectedValue(Object.assign(new Error('offline'), { status: 0 }));
      mockClearSession.mockClear();

      const { result } = renderHookWithQueryClient(() => useAuthSession());

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
      expect(mockClearSession).not.toHaveBeenCalled();
    });
  });

  describe('useAuthMe', () => {
    it('returns the user envelope with has_password true', async () => {
      mockFetchAuthMe.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        has_password: true,
      });

      const { result } = renderHookWithQueryClient(() => useAuthMe());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        user: { id: 'user-123', email: 'test@example.com' },
        has_password: true,
      });
    });

    it('returns has_password false for OAuth-only users', async () => {
      mockFetchAuthMe.mockResolvedValue({
        user: { id: 'user-456' },
        has_password: false,
      });

      const { result } = renderHookWithQueryClient(() => useAuthMe());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        user: { id: 'user-456' },
        has_password: false,
      });
    });

    it('does not fetch when disabled', () => {
      const { result } = renderHookWithQueryClient(() => useAuthMe({ enabled: false }));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockFetchAuthMe).not.toHaveBeenCalled();
    });
  });
});
