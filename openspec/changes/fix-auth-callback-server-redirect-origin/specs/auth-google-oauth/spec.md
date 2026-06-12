# auth-google-oauth — Delta Spec

## MODIFIED Requirements

### Requirement: The `/auth/callback` server route MUST redirect to the public origin after exchanging the Google-issued code

**Previously:** The route's success and error redirects used `request.nextUrl.origin`, which in Docker deployments resolved to the internal container address (e.g. `http://localhost:8080`) and put that origin in the browser's address bar.

**Now:** Both redirects go through `getAppUrl(request.nextUrl.origin)`, which prefers `process.env.NEXT_PUBLIC_APP_URL` and only falls back to the request origin when the env var is unset. See the full requirement language and scenarios in `openspec/specs/auth-google-oauth/spec.md`.
