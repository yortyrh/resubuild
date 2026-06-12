'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { changePassword, logout } from '@/lib/api';
import { authCallbackUrl, resetPasswordCallbackUrl } from '@/lib/auth/app-url';
import { clearSession, persistSupabaseSession, STORAGE_KEYS } from '@/lib/auth-session';
import { getSupabaseClient } from '@/lib/supabase/client';
import { authKeys } from './auth-queries';

export { authKeys };

function authErrorMessage(error: { message: string } | null, fallback: string): string {
  return error?.message ?? fallback;
}

async function syncSessionAfterAuth(): Promise<void> {
  const { data } = await getSupabaseClient().auth.getSession();
  if (data.session) {
    persistSupabaseSession(data.session);
  }
}

// ---------------------------------------------------------------------------
// Login / Register
// ---------------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.session) {
        throw new Error(authErrorMessage(error, 'Invalid credentials'));
      }
      return data.session;
    },
    onSuccess: async (session) => {
      persistSupabaseSession(session);
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
      const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
      if (error) {
        throw new Error(authErrorMessage(error, 'Registration failed'));
      }
      if (data.session) {
        return { kind: 'session' };
      }
      return {
        kind: 'verification',
        message: 'Check your email to confirm your account, then sign in.',
      };
    },
    onSuccess: async (result) => {
      if (result.kind === 'session') {
        await syncSessionAfterAuth();
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
      const token = sessionStorage.getItem(STORAGE_KEYS.access_token);
      if (token) {
        await logout(token).catch(() => {});
      }
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) {
        throw new Error(error.message);
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
    onSuccess: async (_data, variables) => {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;

      if (email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: variables.newPassword,
        });
        if (signInError) {
          toast.error('Password updated, but you need to sign in again');
          clearSession();
        } else {
          await syncSessionAfterAuth();
        }
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
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordCallbackUrl(),
      });
      if (error) {
        throw new Error(error.message);
      }
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await getSupabaseClient().auth.updateUser({ password });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      await getSupabaseClient().auth.signOut();
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
      const { error } = await getSupabaseClient().auth.signInWithOtp({ email });
      if (error) {
        throw new Error(error.message);
      }
    },
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      const { data, error } = await getSupabaseClient().auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error || !data.session) {
        throw new Error(authErrorMessage(error, 'Invalid or expired code'));
      }
      return data.session;
    },
    onSuccess: async (session) => {
      persistSupabaseSession(session);
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      router.push('/dashboard');
      router.refresh();
    },
  });
}

export function useSendMagicLink() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await getSupabaseClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: authCallbackUrl() },
      });
      if (error) {
        throw new Error(error.message);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export function useVerifyEmailToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await getSupabaseClient().auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });
      if (error) {
        return { verified: false as const };
      }
      return { verified: Boolean(data.session) };
    },
  });
}
