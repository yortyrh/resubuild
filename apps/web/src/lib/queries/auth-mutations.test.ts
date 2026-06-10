// @vitest-environment jsdom

import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockChangePassword = vi.fn();
const mockLogout = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockSetSession = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockSaveSession = vi.fn();
const mockPersistSupabaseSession = vi.fn();
const mockClearSession = vi.fn();

vi.mock('@/lib/api', () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

vi.mock('@/lib/auth-session', () => ({
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
  persistSupabaseSession: (...args: unknown[]) => mockPersistSupabaseSession(...args),
  clearSession: (...args: unknown[]) => mockClearSession(...args),
  STORAGE_KEYS: {
    access_token: 'resubuild.access_token',
    refresh_token: 'resubuild.refresh_token',
    expires_at: 'resubuild.expires_at',
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
      setSession: mockSetSession,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
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
  useVerifyOtp,
} from '@/lib/queries/auth-mutations';
import { renderHookWithQueryClient } from '@/lib/queries/test-utils';

const sampleSession = {
  user: { id: 'user-1', email: 'test@example.com' },
  access_token: 'tok-abc',
  refresh_token: 'ref-xyz',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
};

describe('auth mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => 'tok-abc'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  describe('useLogin', () => {
    it('signs in via supabase, persists session, and redirects on success', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: sampleSession },
        error: null,
      });

      const { result } = renderHookWithQueryClient(() => useLogin());

      result.current.mutate({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(mockPersistSupabaseSession).toHaveBeenCalledWith(sampleSession);
      });
    });

    it('clears session on error', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid credentials' },
      });

      const { result } = renderHookWithQueryClient(() => useLogin());

      result.current.mutate({ email: 'bad@example.com', password: 'wrong' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockClearSession).toHaveBeenCalled();
    });
  });

  describe('useLogout', () => {
    it('calls API logout, supabase signOut, and clears session', async () => {
      mockLogout.mockResolvedValue(undefined);
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHookWithQueryClient(() => useLogout());

      result.current.mutate();

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledWith('tok-abc');
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockClearSession).toHaveBeenCalled();
    });
  });

  describe('useChangePassword', () => {
    it('calls changePassword with current password', async () => {
      mockChangePassword.mockResolvedValue(undefined);
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHookWithQueryClient(() => useChangePassword());

      result.current.mutate({ currentPassword: 'oldpass', newPassword: 'newpass123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockChangePassword).toHaveBeenCalledWith('oldpass', 'newpass123');
    });

    it('re-authenticates with the new password to refresh the invalidated session', async () => {
      mockChangePassword.mockResolvedValue(undefined);
      mockGetSession.mockResolvedValue({
        data: { session: { user: { email: 'test@example.com' } } },
      });
      mockSignInWithPassword.mockResolvedValue({ data: { session: sampleSession }, error: null });

      const { result } = renderHookWithQueryClient(() => useChangePassword());

      result.current.mutate({ currentPassword: 'oldpass', newPassword: 'newpass123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'newpass123',
      });
    });
  });

  describe('useForgotPassword', () => {
    it('calls supabase resetPasswordForEmail', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const { result } = renderHookWithQueryClient(() => useForgotPassword());

      result.current.mutate('test@example.com');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: expect.stringContaining('/reset-password'),
      });
    });
  });

  describe('useResetPassword', () => {
    it('calls supabase updateUser with the new password', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHookWithQueryClient(() => useResetPassword());

      result.current.mutate('newpassword123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('useRequestOtp', () => {
    it('calls supabase signInWithOtp', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      const { result } = renderHookWithQueryClient(() => useRequestOtp());

      result.current.mutate('test@example.com');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSignInWithOtp).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('useVerifyOtp', () => {
    it('verifies OTP and persists session on success', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { session: sampleSession },
        error: null,
      });

      const { result } = renderHookWithQueryClient(() => useVerifyOtp());

      result.current.mutate({ email: 'test@example.com', token: '123456' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      });
      expect(mockPersistSupabaseSession).toHaveBeenCalledWith(sampleSession);
    });
  });

  describe('useRegister', () => {
    it('persists session when signUp returns a session', async () => {
      mockSignUp.mockResolvedValue({
        data: { session: sampleSession, user: sampleSession.user },
        error: null,
      });
      mockGetSession.mockResolvedValue({ data: { session: sampleSession } });

      const { result } = renderHookWithQueryClient(() => useRegister());

      result.current.mutate({ email: 'new@example.com', password: 'newpassword123' });

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'newpassword123',
        });
      });

      await waitFor(() => {
        expect(mockPersistSupabaseSession).toHaveBeenCalled();
      });
    });

    it('does not persist session when email verification is required', async () => {
      mockSignUp.mockResolvedValue({
        data: { session: null, user: { id: 'u1' } },
        error: null,
      });

      const { result } = renderHookWithQueryClient(() => useRegister());

      result.current.mutate({ email: 'verify@example.com', password: 'newpassword123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockPersistSupabaseSession).not.toHaveBeenCalled();
      expect(result.current.data).toEqual({
        kind: 'verification',
        message: 'Check your email to confirm your account, then sign in.',
      });
    });
  });

  describe('useSendMagicLink', () => {
    it('calls supabase signInWithOtp with a callback URL', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      const { result } = renderHookWithQueryClient(() => useSendMagicLink());

      result.current.mutate('test@example.com');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { emailRedirectTo: expect.stringContaining('/auth/callback') },
      });
    });
  });

  describe('useVerifyEmailToken', () => {
    it('verifies email token via supabase verifyOtp', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { session: sampleSession },
        error: null,
      });

      const { result } = renderHookWithQueryClient(() => useVerifyEmailToken());

      result.current.mutate('abc123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'abc123',
        type: 'email',
      });
      expect(result.current.data).toEqual({ verified: true });
    });

    it('returns verified false when verification fails', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { session: null },
        error: { message: 'expired' },
      });

      const { result } = renderHookWithQueryClient(() => useVerifyEmailToken());

      result.current.mutate('expired-token');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ verified: false });
    });
  });
});
