'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { changePassword, logout } from '@/lib/api';
import { resetPasswordCallbackUrl } from '@/lib/auth/app-url';
import { authRequest } from '@/lib/auth/client';
import { clearSession, getSessionToken, saveSessionToken } from '@/lib/auth-session';
import { authKeys } from './auth-queries';

export { authKeys };

function requireToken(token: string | null, message: string): string {
  if (!token) throw new Error(message);
  return token;
}

/** Display name for new accounts (Better Auth requires one): the email's local part. */
function nameFromEmail(email: string): string {
  return email.split('@')[0] || email;
}

// ---------------------------------------------------------------------------
// Login / Register
// ---------------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { token } = await authRequest('/sign-in/email', { body: { email, password } });
      return requireToken(token, 'Invalid credentials');
    },
    onSuccess: (token) => {
      saveSessionToken(token);
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      router.push('/dashboard');
      router.refresh();
    },
    onError: () => {
      clearSession();
    },
  });
}

export type RegisterResult = { kind: 'session' } | { kind: 'verification'; message: string };

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<RegisterResult> => {
      const { token } = await authRequest('/sign-up/email', {
        body: { email, password, name: nameFromEmail(email) },
      });
      if (token) {
        saveSessionToken(token);
        return { kind: 'session' };
      }
      return {
        kind: 'verification',
        message: 'Check your email to confirm your account, then sign in.',
      };
    },
    onSuccess: (result) => {
      if (result.kind === 'session') {
        void queryClient.invalidateQueries({ queryKey: authKeys.session() });
        router.push('/dashboard');
        router.refresh();
        return;
      }
      router.push('/auth/check-email');
    },
    onError: () => {
      clearSession();
    },
  });
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const token = getSessionToken();
      if (token) {
        await logout(token).catch(() => {});
      }
    },
    onSettled: () => {
      clearSession();
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      router.push('/login');
      router.refresh();
    },
  });
}

// ---------------------------------------------------------------------------
// Password change / recovery
// ---------------------------------------------------------------------------

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword?: string;
      newPassword: string;
    }) => changePassword(currentPassword, newPassword),
    onSuccess: (data) => {
      // Changing the password revokes every session and returns a new token.
      if (data?.token) {
        saveSessionToken(data.token);
      }
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success('Password updated successfully');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await authRequest('/request-password-reset', {
        body: { email, redirectTo: resetPasswordCallbackUrl() },
      });
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      if (!token) throw new Error('This reset link is invalid or has expired.');
      await authRequest('/reset-password', { body: { token, newPassword: password } });
    },
    onSuccess: () => {
      clearSession();
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      toast.success('Password reset successful. Please sign in.');
      router.push('/login');
    },
  });
}

// ---------------------------------------------------------------------------
// OTP / Magic link
// ---------------------------------------------------------------------------

export function useRequestOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      await authRequest('/email-otp/send-verification-otp', {
        body: { email, type: 'sign-in' },
      });
    },
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      const result = await authRequest('/sign-in/email-otp', { body: { email, otp: token } });
      return requireToken(result.token, 'Invalid or expired code');
    },
    onSuccess: (token) => {
      saveSessionToken(token);
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      router.push('/dashboard');
      router.refresh();
    },
  });
}

export function useSendMagicLink() {
  return useMutation({
    mutationFn: async (email: string) => {
      await authRequest('/sign-in/magic-link', { body: { email } });
    },
  });
}

/** Completes a magic-link sign-in from the emailed `/auth/magic?token=…` link. */
export function useVerifyMagicLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const result = await authRequest('/magic-link/verify', {
        method: 'GET',
        query: { token },
      });
      const sessionToken = requireToken(
        result.token,
        'This sign-in link is invalid or has expired.',
      );
      saveSessionToken(sessionToken);
      return sessionToken;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/**
 * Verifies the emailed `/auth/verify?token=…` link. Verification signs the
 * user in (Better Auth `autoSignInAfterVerification`).
 */
export function useVerifyEmailToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      try {
        const result = await authRequest('/verify-email', { method: 'GET', query: { token } });
        if (result.token) {
          saveSessionToken(result.token);
        }
        return { verified: true as const, signedIn: Boolean(result.token) };
      } catch {
        return { verified: false as const, signedIn: false };
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}
