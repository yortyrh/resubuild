// @vitest-environment jsdom

import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockChangePassword = vi.fn();
const mockLogout = vi.fn();
const mockAuthRequest = vi.fn();
const mockSaveSessionToken = vi.fn();
const mockGetSessionToken = vi.fn();
const mockClearSession = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/api', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

vi.mock('@/lib/auth/client', () => ({
  authRequest: (...args: unknown[]) => mockAuthRequest(...args),
}));

vi.mock('@/lib/auth-session', () => ({
  saveSessionToken: (...args: unknown[]) => mockSaveSessionToken(...args),
  getSessionToken: () => mockGetSessionToken(),
  clearSession: (...args: unknown[]) => mockClearSession(...args),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

import {
  useChangePassword,
  useForgotPassword,
  useLogin,
  useLogout,
  useRegister,
  useRequestOtp,
  useResetPassword,
  useSendMagicLink,
  useVerifyEmailToken,
  useVerifyMagicLink,
  useVerifyOtp,
} from '@/lib/queries/auth-mutations';
import { renderHookWithQueryClient } from '@/lib/queries/test-utils';

describe('auth mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useLogin', () => {
    it('signs in, stores the token and goes to the dashboard', async () => {
      mockAuthRequest.mockResolvedValue({ data: {}, token: 'tok-1' });
      const { result } = renderHookWithQueryClient(() => useLogin());

      result.current.mutate({ email: 'a@b.c', password: 'secret' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/sign-in/email', {
        body: { email: 'a@b.c', password: 'secret' },
      });
      expect(mockSaveSessionToken).toHaveBeenCalledWith('tok-1');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('clears the session when sign-in fails or returns no token', async () => {
      mockAuthRequest.mockResolvedValue({ data: {}, token: null });
      const { result } = renderHookWithQueryClient(() => useLogin());

      result.current.mutate({ email: 'a@b.c', password: 'bad' });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Invalid credentials');
      expect(mockClearSession).toHaveBeenCalled();
    });
  });

  describe('useRegister', () => {
    it('stores the token when sign-up returns a session', async () => {
      mockAuthRequest.mockResolvedValue({ data: {}, token: 'tok-new' });
      const { result } = renderHookWithQueryClient(() => useRegister());

      result.current.mutate({ email: 'jane@x.test', password: 'secret12' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/sign-up/email', {
        body: { email: 'jane@x.test', password: 'secret12', name: 'jane' },
      });
      expect(result.current.data).toEqual({ kind: 'session' });
      expect(mockSaveSessionToken).toHaveBeenCalledWith('tok-new');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('asks to check email when verification is required', async () => {
      mockAuthRequest.mockResolvedValue({ data: { token: null }, token: null });
      const { result } = renderHookWithQueryClient(() => useRegister());

      result.current.mutate({ email: 'jane@x.test', password: 'secret12' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toMatchObject({ kind: 'verification' });
      expect(mockSaveSessionToken).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/check-email');
    });
  });

  describe('useLogout', () => {
    it('revokes the session on the API and clears it locally', async () => {
      mockGetSessionToken.mockReturnValue('tok-abc');
      mockLogout.mockRejectedValue(new Error('offline'));
      const { result } = renderHookWithQueryClient(() => useLogout());

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockLogout).toHaveBeenCalledWith('tok-abc');
      expect(mockClearSession).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('skips the API call without a token', async () => {
      mockGetSessionToken.mockReturnValue(null);
      const { result } = renderHookWithQueryClient(() => useLogout());
      result.current.mutate();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  describe('useChangePassword', () => {
    it('stores the replacement token returned by the API', async () => {
      mockChangePassword.mockResolvedValue({ updated: true, token: 'tok-rotated' });
      const { result } = renderHookWithQueryClient(() => useChangePassword());

      result.current.mutate({ currentPassword: 'old', newPassword: 'new-password' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockChangePassword).toHaveBeenCalledWith('old', 'new-password');
      expect(mockSaveSessionToken).toHaveBeenCalledWith('tok-rotated');
    });

    it('keeps the current token when none is returned (first password)', async () => {
      mockChangePassword.mockResolvedValue({ updated: true });
      const { result } = renderHookWithQueryClient(() => useChangePassword());
      result.current.mutate({ newPassword: 'new-password' });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockSaveSessionToken).not.toHaveBeenCalled();
    });
  });

  describe('password recovery', () => {
    it('useForgotPassword requests a reset link back to /reset-password', async () => {
      mockAuthRequest.mockResolvedValue({ data: {}, token: null });
      const { result } = renderHookWithQueryClient(() => useForgotPassword());

      result.current.mutate('a@b.c');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/request-password-reset', {
        body: { email: 'a@b.c', redirectTo: `${window.location.origin}/reset-password` },
      });
    });

    it('useResetPassword submits the token and new password, then goes to login', async () => {
      mockAuthRequest.mockResolvedValue({ data: { status: true }, token: null });
      const { result } = renderHookWithQueryClient(() => useResetPassword());

      result.current.mutate({ token: 'reset-tok', password: 'new-password' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/reset-password', {
        body: { token: 'reset-tok', newPassword: 'new-password' },
      });
      expect(mockClearSession).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('useResetPassword rejects a missing token', async () => {
      const { result } = renderHookWithQueryClient(() => useResetPassword());
      result.current.mutate({ token: '', password: 'x' });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockAuthRequest).not.toHaveBeenCalled();
    });
  });

  describe('passwordless', () => {
    it('useRequestOtp sends a sign-in code', async () => {
      mockAuthRequest.mockResolvedValue({ data: { success: true }, token: null });
      const { result } = renderHookWithQueryClient(() => useRequestOtp());
      result.current.mutate('a@b.c');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/email-otp/send-verification-otp', {
        body: { email: 'a@b.c', type: 'sign-in' },
      });
    });

    it('useVerifyOtp signs in with the code', async () => {
      mockAuthRequest.mockResolvedValue({ data: {}, token: 'tok-otp' });
      const { result } = renderHookWithQueryClient(() => useVerifyOtp());
      result.current.mutate({ email: 'a@b.c', token: '123456' });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/sign-in/email-otp', {
        body: { email: 'a@b.c', otp: '123456' },
      });
      expect(mockSaveSessionToken).toHaveBeenCalledWith('tok-otp');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('useVerifyOtp fails on a wrong code', async () => {
      mockAuthRequest.mockResolvedValue({ data: {}, token: null });
      const { result } = renderHookWithQueryClient(() => useVerifyOtp());
      result.current.mutate({ email: 'a@b.c', token: '000000' });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Invalid or expired code');
    });

    it('useSendMagicLink requests a link', async () => {
      mockAuthRequest.mockResolvedValue({ data: { status: true }, token: null });
      const { result } = renderHookWithQueryClient(() => useSendMagicLink());
      result.current.mutate('a@b.c');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/sign-in/magic-link', {
        body: { email: 'a@b.c' },
      });
    });

    it('useVerifyMagicLink exchanges the emailed token for a session', async () => {
      mockAuthRequest.mockResolvedValue({ data: {}, token: 'tok-magic' });
      const { result } = renderHookWithQueryClient(() => useVerifyMagicLink());
      result.current.mutate('magic-tok');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/magic-link/verify', {
        method: 'GET',
        query: { token: 'magic-tok' },
      });
      expect(mockSaveSessionToken).toHaveBeenCalledWith('tok-magic');
    });

    it('useVerifyMagicLink fails when no session is created', async () => {
      mockAuthRequest.mockResolvedValue({ data: {}, token: null });
      const { result } = renderHookWithQueryClient(() => useVerifyMagicLink());
      result.current.mutate('bad');
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useVerifyEmailToken', () => {
    it('verifies and signs in when the API returns a session', async () => {
      mockAuthRequest.mockResolvedValue({ data: { status: true }, token: 'tok-verified' });
      const { result } = renderHookWithQueryClient(() => useVerifyEmailToken());
      result.current.mutate('verify-tok');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAuthRequest).toHaveBeenCalledWith('/verify-email', {
        method: 'GET',
        query: { token: 'verify-tok' },
      });
      expect(result.current.data).toEqual({ verified: true, signedIn: true });
      expect(mockSaveSessionToken).toHaveBeenCalledWith('tok-verified');
    });

    it('verifies without a session', async () => {
      mockAuthRequest.mockResolvedValue({ data: { status: true }, token: null });
      const { result } = renderHookWithQueryClient(() => useVerifyEmailToken());
      result.current.mutate('verify-tok');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ verified: true, signedIn: false });
    });

    it('returns verified false when verification fails', async () => {
      mockAuthRequest.mockRejectedValue(new Error('invalid token'));
      const { result } = renderHookWithQueryClient(() => useVerifyEmailToken());
      result.current.mutate('bad');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ verified: false, signedIn: false });
    });
  });
});
