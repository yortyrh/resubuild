## Why

Loading `/login` during local development logs a React hydration mismatch on the **Register** cross-link inside `LoginForm`. The diff shows an unexpected `data-cursor-ref` attribute on the anchor that is not present in the client render tree. This noise makes real hydration regressions harder to spot and indicates the auth pages hydrate more client markup than necessary for static navigation chrome.

## What Changes

- Document how to reproduce and verify the hydration warning (Cursor embedded browser vs standard browser).
- Refactor `/login` and `/register` so static page chrome (titles, descriptions, auth cross-links) renders from Server Components; client components retain only interactive form state and submit handling.
- Extract a shared auth cross-link helper for consistent markup between login and register pages.
- Add a focused unit test ensuring auth cross-links are not rendered inside `'use client'` form modules.
- Confirm no hydration warning on `/login` or `/register` in a standard browser dev session after the refactor.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `web-application`: Auth pages (`/login`, `/register`) SHALL render static navigation cross-links from Server Components so they are not part of the client hydration subtree.

## Impact

- **Frontend**: `apps/web/src/app/login/page.tsx`, `apps/web/src/app/register/page.tsx`, `apps/web/src/components/auth/login-form.tsx`, `apps/web/src/components/auth/register-form.tsx`; possible new shared helper under `apps/web/src/components/auth/`.
- **Tests**: Colocated unit test beside the new shared helper or auth page modules.
- **API / database**: None.
- **E2E**: None — UI-only change; existing auth scenarios unchanged.
