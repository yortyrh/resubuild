'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  register,
  requestOtp,
  resetPassword,
  verifyEmail,
  verifyOtp,
} from '@/lib/api';
import { type AuthTokenPayload, clearSession, saveSession } from '@/lib/auth-session';
import { getSupabaseClient } from '@/lib/supabase/client';
import { authKeys } from './auth-queries';

export { authKeys };

// ---------------------------------------------------------------------------
// Login / Register
// ---------------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: async (data) => {
      const payload: AuthTokenPayload = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: 'bearer',
        user: data.user,
      };
      saveSession(payload);

      // The API issues tokens server-side; hydrate the browser Supabase
      // client so useAuthSession/SessionGate see the session and the client
      // can auto-refresh tokens.
      await getSupabaseClient().auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      router.push('/dashboard');
      router.refresh();
    },
    onError: () => {
      clearSession();
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      register(email, password),
    onSuccess: async (data) => {
      if ('access_token' in data && data.access_token) {
        const payload: AuthTokenPayload = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          token_type: 'bearer',
          user: (data as { user?: { id: string; email?: string } }).user ?? { id: '' },
        };
        saveSession(payload);

        // Hydrate the browser Supabase client so SessionGate sees the session.
        await getSupabaseClient().auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        void queryClient.invalidateQueries({ queryKey: authKeys.session() });
        router.push('/dashboard');
        router.refresh();
      }
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
    mutationFn: () => {
      const token = sessionStorage.getItem('resubuild.access_token');
      if (token) {
        return logout(token);
      }
      return Promise.resolve();
    },
    onSettled: () => {
      getSupabaseClient().auth.signOut();
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
    onSuccess: async (_data, variables) => {
      // The server uses supabase.auth.admin.updateUserById, which invalidates
      // the current session's JWT and refresh token. Re-establish a fresh
      // session by signing in with the new password so subsequent API calls
      // don't fail with 401 "Invalid or expired token".
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;

      if (email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: variables.newPassword,
        });
        if (signInError) {
          // If re-authentication fails, surface the error and let the user
          // sign in manually. Do not pretend the password change succeeded
          // beyond what the server already confirmed.
          toast.error('Password updated, but you need to sign in again');
          clearSession();
        }
      } else {
        // No email in the current session (e.g. magic link user) — nothing
        // to sign in with. The server still updated the password.
      }

      // Force the auth queries to refetch so the new session is picked up
      // (e.g. the me query will return has_password: true after sign-in).
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });

      toast.success('Password updated successfully');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });
}

// ---------------------------------------------------------------------------
// Password reset (Supabase recovery flow)
// ---------------------------------------------------------------------------

export function useResetPassword() {
  return useMutation({
    mutationFn: ({
      accessToken,
      refreshToken,
      password,
    }: {
      accessToken: string;
      refreshToken: string;
      password: string;
    }) => resetPassword(accessToken, refreshToken, password),
  });
}

// ---------------------------------------------------------------------------
// OTP / Magic link
// ---------------------------------------------------------------------------

export function useRequestOtp() {
  return useMutation({
    mutationFn: (email: string) => requestOtp(email),
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ email, token }: { email: string; token: string }) => verifyOtp(email, token),
    onSuccess: async () => {
      // Sync Supabase session into our storage mirror
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        saveSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token ?? '',
          expires_in: data.session.expires_in,
          expires_at: data.session.expires_at,
          token_type: data.session.token_type,
          user: data.session.user,
        });
      }
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      router.push('/dashboard');
      router.refresh();
    },
  });
}

export function useSendMagicLink() {
  return useMutation({
    mutationFn: (email: string) =>
      getSupabaseClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      }),
  });
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export function useVerifyEmailToken() {
  return useMutation({
    mutationFn: (token: string) => verifyEmail(token),
  });
}

// ---------------------------------------------------------------------------
// OAuth helpers (wrapping Supabase client, no API call)
// ---------------------------------------------------------------------------

export function useGithubSignIn() {
  return useMutation({
    mutationFn: () =>
      getSupabaseClient().auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      }),
  });
}

export function useGoogleSignIn() {
  return useMutation({
    mutationFn: () =>
      getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      }),
  });
}
