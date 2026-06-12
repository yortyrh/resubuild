import { type NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/auth/app-url';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Auth callback for Supabase PKCE flows (magic links, email redirects).
 *
 * This route handler runs on the server, so the `sb-<ref>-auth-token-code-verifier`
 * cookie that `@supabase/ssr` writes during sign-in is read directly from the
 * request. On success, the session cookies are written by the SDK and we 302 to
 * `/dashboard`. On failure we 302 to `/login?error=…&error_description=…` so the
 * login page can surface `oauthCallbackErrorMessage` copy.
 *
 * Every absolute redirect built here uses `getAppUrl(request.nextUrl.origin)`,
 * which prefers `NEXT_PUBLIC_APP_URL` (the public origin baked in at build
 * time) and only falls back to the request's apparent origin when the env var
 * is unset. In Docker / reverse-proxy deployments the request origin is the
 * internal container address (e.g. `http://localhost:8080`), so the env var
 * is what keeps the browser's address bar pointed at the real public URL.
 */

function safeNext(next: string | null): string {
  if (!next) return '/dashboard';
  // Only allow same-origin relative paths; reject anything else to avoid
  // open-redirect attacks via `?next=https://attacker.example`.
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  return next;
}

function loginUrlWithError(request: NextRequest, params: URLSearchParams): URL {
  const url = new URL('/login', getAppUrl(request.nextUrl.origin));
  for (const [key, value] of params.entries()) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const providerError = requestUrl.searchParams.get('error');
  const providerErrorCode = requestUrl.searchParams.get('error_code');
  const providerErrorDescription = requestUrl.searchParams.get('error_description');
  const next = safeNext(requestUrl.searchParams.get('next'));

  // Supabase forwarded an error — pass the params through to /login.
  if (providerError || providerErrorDescription) {
    const params = new URLSearchParams();
    if (providerError) params.set('error', providerError);
    if (providerErrorCode) params.set('error_code', providerErrorCode);
    if (providerErrorDescription) params.set('error_description', providerErrorDescription);
    return NextResponse.redirect(loginUrlWithError(request, params));
  }

  if (!code) {
    // No code and no error — malformed callback URL.
    return NextResponse.redirect(
      loginUrlWithError(
        request,
        new URLSearchParams({
          error: 'missing_code',
          error_description: 'The auth callback was missing the authorization code.',
        }),
      ),
    );
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const params = new URLSearchParams();
    params.set('error', error.code ?? 'exchange_failed');
    params.set('error_code', error.code ?? 'exchange_failed');
    params.set('error_description', error.message);
    return NextResponse.redirect(loginUrlWithError(request, params));
  }

  return NextResponse.redirect(new URL(next, getAppUrl(request.nextUrl.origin)));
}
