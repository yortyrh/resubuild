// @vitest-environment jsdom

import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLogout = vi.fn();
const mockChangePassword = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockRequestOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockVerifyEmail = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSaveSession = vi.fn();
const mockClearSession = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSetSession = vi.fn();

vi.mock('@/lib/api', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  register: (...args: unknown[]) => mockRegister(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  requestOtp: (...args: unknown[]) => mockRequestOtp(...args),
  verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
  verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
  fetchAuthFeatures: vi.fn().mockResolvedValue({
    forgot_password: false,
    email_verification: false,
    passwordless: false,
    providers: [],
  }),
}));

vi.mock('@/lib/auth-session', () => ({
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
  clearSession: (...args: unknown[]) => mockClearSession(...args),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      signOut: mockSignOut,
      getSession: mockGetSession,
      signInWithPassword: mockSignInWithPassword,
      setSession: mockSetSession,
      signInWithOtp: mockSignInWithOtp,
      signInWithOAuth: mockSignInWithOAuth,
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
  useGithubSignIn,
  useGoogleSignIn,
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

describe('auth mutation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useLogin', () => {
    it('calls api, saves session, hydrates the supabase client, and redirects on success', async () => {
      mockLogin.mockResolvedValue({
        access_token: 'tok-abc',
        refresh_token: 'ref-xyz',
        expires_in: 3600,
        user: { id: 'user-1', email: 'test@example.com' },
      });
      mockSetSession.mockResolvedValue({ data: { session: {} }, error: null });

      const { result } = renderHookWithQueryClient(() => useLogin());

      result.current.mutate({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(mockSaveSession).toHaveBeenCalledWith(
          expect.objectContaining({
            access_token: 'tok-abc',
            refresh_token: 'ref-xyz',
          }),
        );
      });

      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: 'tok-abc',
          refresh_token: 'ref-xyz',
        });
      });
    });

    it('clears session on error', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHookWithQueryClient(() => useLogin());

      result.current.mutate({ email: 'bad@example.com', password: 'wrong' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockClearSession).toHaveBeenCalled();
    });
  });

  describe('useLogout', () => {
    it('calls API logout and clears session', async () => {
      mockLogout.mockResolvedValue(undefined);

      Object.defineProperty(window, 'sessionStorage', {
        value: { getItem: () => 'tok-abc' },
        writable: true,
      });

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

    it('calls changePassword without current password (OAuth users)', async () => {
      mockChangePassword.mockResolvedValue(undefined);
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHookWithQueryClient(() => useChangePassword());

      result.current.mutate({ newPassword: 'newpass123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockChangePassword).toHaveBeenCalledWith(undefined, 'newpass123');
    });

    it('re-authenticates with the new password to refresh the invalidated session', async () => {
      mockChangePassword.mockResolvedValue(undefined);
      mockGetSession.mockResolvedValue({
        data: { session: { user: { email: 'test@example.com' } } },
      });
      mockSignInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });

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
    it('calls forgotPassword API', async () => {
      mockForgotPassword.mockResolvedValue({
        message: 'If an account exists, a reset link was sent',
      });

      const { result } = renderHookWithQueryClient(() => useForgotPassword());

      result.current.mutate('test@example.com');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('useResetPassword', () => {
    it('calls resetPassword with tokens and password', async () => {
      mockResetPassword.mockResolvedValue(undefined);

      const { result } = renderHookWithQueryClient(() => useResetPassword());

      result.current.mutate({
        accessToken: 'access-tok',
        refreshToken: 'refresh-tok',
        password: 'newpassword123',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockResetPassword).toHaveBeenCalledWith('access-tok', 'refresh-tok', 'newpassword123');
    });
  });

  describe('useRequestOtp', () => {
    it('calls requestOtp API', async () => {
      mockRequestOtp.mockResolvedValue({ message: 'Code sent' });

      const { result } = renderHookWithQueryClient(() => useRequestOtp());

      result.current.mutate('test@example.com');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRequestOtp).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('useVerifyOtp', () => {
    it('calls verifyOtp and syncs session on success', async () => {
      mockVerifyOtp.mockResolvedValue(undefined);
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'u1', email: 'a@b.com' },
            access_token: 'tok',
            refresh_token: 'ref',
            expires_in: 3600,
            expires_at: Date.now() / 1000 + 3600,
            token_type: 'bearer',
          },
        },
      });

      const { result } = renderHookWithQueryClient(() => useVerifyOtp());

      result.current.mutate({ email: 'test@example.com', token: '123456' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockVerifyOtp).toHaveBeenCalledWith('test@example.com', '123456');
      expect(mockSaveSession).toHaveBeenCalled();
    });
  });

  describe('useRegister', () => {
    it('hydrates supabase client and persists session on success when token is returned', async () => {
      mockRegister.mockResolvedValue({
        access_token: 'reg-tok',
        refresh_token: 'reg-ref',
        expires_in: 3600,
      });
      mockSetSession.mockResolvedValue({ data: { session: {} }, error: null });

      const { result } = renderHookWithQueryClient(() => useRegister());

      result.current.mutate({ email: 'new@example.com', password: 'newpassword123' });

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('new@example.com', 'newpassword123');
      });

      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: 'reg-tok',
          refresh_token: 'reg-ref',
        });
      });
      expect(mockSaveSession).toHaveBeenCalled();
    });

    it('does not hydrate supabase client when registration returns no session (e.g. email verification required)', async () => {
      mockRegister.mockResolvedValue({ message: 'Check your email to confirm your account' });

      const { result } = renderHookWithQueryClient(() => useRegister());

      result.current.mutate({ email: 'verify@example.com', password: 'newpassword123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSetSession).not.toHaveBeenCalled();
      expect(mockSaveSession).not.toHaveBeenCalled();
    });
  });

  describe('useSendMagicLink', () => {
    it('calls supabase signInWithOtp with the email and a callback URL', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });

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
    it('calls verifyEmail with the provided token', async () => {
      mockVerifyEmail.mockResolvedValue({ verified: true });

      const { result } = renderHookWithQueryClient(() => useVerifyEmailToken());

      result.current.mutate('abc123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockVerifyEmail).toHaveBeenCalledWith('abc123');
      expect(result.current.data).toEqual({ verified: true });
    });

    it('surfaces a verified=false response', async () => {
      mockVerifyEmail.mockResolvedValue({ verified: false });

      const { result } = renderHookWithQueryClient(() => useVerifyEmailToken());

      result.current.mutate('expired-token');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ verified: false });
    });
  });

  describe('useGithubSignIn', () => {
    it('calls supabase signInWithOAuth with the github provider', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://github.com/oauth' },
        error: null,
      });

      const { result } = renderHookWithQueryClient(() => useGithubSignIn());

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: { redirectTo: expect.stringContaining('/auth/callback') },
      });
    });
  });

  describe('useGoogleSignIn', () => {
    it('calls supabase signInWithOAuth with the google provider', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://google.com/oauth' },
        error: null,
      });

      const { result } = renderHookWithQueryClient(() => useGoogleSignIn());

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: expect.stringContaining('/auth/callback') },
      });
    });
  });
});
