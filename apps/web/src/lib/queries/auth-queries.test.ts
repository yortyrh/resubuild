// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockFetchAuthMe = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchAuthMe: (...args: unknown[]) => mockFetchAuthMe(...args),
}));

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  }),
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
      });
    });

    it('does not fetch when disabled — uses initialData synchronously', () => {
      const getAuthFeaturesSpy = vi.spyOn(featuresModule, 'getAuthFeatures').mockReturnValue({
        forgot_password: true,
        email_verification: false,
        passwordless: true,
        github_oauth: false,
        google_oauth: false,
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
        });
        expect(getAuthFeaturesSpy).toHaveBeenCalled();
      } finally {
        getAuthFeaturesSpy.mockRestore();
      }
    });
  });

  describe('useAuthSession', () => {
    it('returns exists:false when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHookWithQueryClient(() => useAuthSession());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        exists: false,
        userId: null,
        email: null,
        emailVerified: false,
      });
    });

    it('returns session data when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
            access_token: 'tok-abc',
            refresh_token: 'ref-xyz',
            expires_in: 3600,
            expires_at: Date.now() / 1000 + 3600,
            token_type: 'bearer',
          },
        },
      });

      const { result } = renderHookWithQueryClient(() => useAuthSession());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        exists: true,
        userId: 'user-123',
        email: 'test@example.com',
      });
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
