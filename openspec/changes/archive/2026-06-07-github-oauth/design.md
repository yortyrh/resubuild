# design.md

## Decisions

### 1. Server-side code exchange

The OAuth code exchange happens server-side in the NestJS API via `POST /auth/github/callback`. This keeps the GitHub client secret out of the browser and allows the API to mint standard `AuthTokenResponse` tokens — the same shape used by email/password login. The web SPA never handles OAuth tokens directly, only redirects through the browser.

### 2. Redirect URL points to web SPA

The `redirectTo` for GitHub OAuth is set to `<APP_URL>/auth/callback` (the Next.js web app), not directly back to the API. This allows the callback page to POST the code to the API and receive tokens in the same browser context that already has a session established. It also enables future support for additional providers without API changes.

### 3. Suspense boundary on callback page

Next.js 16 requires `useSearchParams()` to be wrapped in a Suspense boundary for static page generation. The callback page exports a shell component that wraps `AuthCallbackInner` in `<Suspense>` to satisfy this requirement.

### 4. GitHub provider enabled in local config

`supabase/config.toml` has `[auth.external.github]` enabled so local development with `supabase start` includes GitHub as an OAuth option. Production configuration (client ID/secret) is set through the Supabase dashboard.
