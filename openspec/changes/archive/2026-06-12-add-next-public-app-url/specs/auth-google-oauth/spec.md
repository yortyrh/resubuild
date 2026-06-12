# auth-google-oauth — Delta Spec

## MODIFIED Requirements

### Requirement: The web SPA MUST provide a Google sign-in button

**Previously:** `redirectTo: \`${APP_URL}/auth/callback\``—`APP_URL`was derived inline in`oauth.ts`from`window.location.origin`.

**Now:** `redirectTo` is built via `authCallbackUrl()` from the new `apps/web/src/lib/auth/app-url.ts` helper, which resolves `process.env.NEXT_PUBLIC_APP_URL` (with `window.location.origin` fallback). All other language in the requirement and scenarios is unchanged.
