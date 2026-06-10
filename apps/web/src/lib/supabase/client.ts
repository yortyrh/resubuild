import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | undefined;

/**
 * Drops stale `sb-*` session-token cookies that can accumulate across failed
 * PKCE flows and trigger 431 responses. PKCE code-verifier cookies are left
 * intact so an in-flight magic-link exchange is not aborted.
 */
export function purgeSupabaseSessionCookies(): void {
  if (typeof document === 'undefined') return;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  const host = window.location.hostname;
  for (const raw of cookies) {
    const name = raw.split('=')[0]?.trim();
    if (!name || !name.startsWith('sb-')) continue;
    // The PKCE verifier is the active in-flight OAuth flow's secret. Deleting
    // it before `exchangeCodeForSession` runs breaks the callback. Skip it
    // (and any chunked variants like `…-code-verifier.0`) on every cleanup.
    if (name.endsWith('-code-verifier') || /-code-verifier\.\d+$/.test(name)) {
      continue;
    }
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}`;
  }
}

/**
 * Browser Supabase client with cookie-backed PKCE storage (required for
 * passwordless magic-link callbacks in Next.js).
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
    const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
    _supabase = createBrowserClient(supabaseUrl, supabasePublishableKey);
  }
  return _supabase;
}
