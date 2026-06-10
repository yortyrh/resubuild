import { type CookieOptions, createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Server-side Supabase client for use inside Next.js Route Handlers, Server
 * Components, and Server Actions.
 *
 * Cookies are read from and written to the request's cookie store so the
 * PKCE `code_verifier` (stored in `sb-<ref>-auth-token-code-verifier`) is
 * available to `exchangeCodeForSession`. With `@supabase/ssr`'s
 * `createBrowserClient` the verifier lives in `document.cookie` on the
 * client, but the same cookie is also sent to the server on every
 * navigation, so a server client with the `cookies()` adapter can read it
 * back. This is the pattern documented in the official Supabase docs for
 * Next.js App Router OAuth:
 * https://supabase.com/docs/guides/auth/social-login/auth-github?environment=server&framework=nextjs
 *
 * `setAll` is invoked by the SDK whenever it needs to refresh tokens
 * (TOKEN_REFRESHED, USER_UPDATED, SIGNED_OUT). In a Route Handler we can
 * write the response cookies via `next/headers`; in a Server Component
 * we cannot (writes are no-ops there, which is fine — token refreshes
 * from RSCs are handled by middleware).
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      async setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // `set` is only available in Route Handlers, Server Actions, and
          // middleware. Inside Server Components, `cookies()` returns a
          // read-only store; the SDK will silently skip the write here
          // because the auth-token refresh is owned by middleware.
        }
      },
    },
  });
}
