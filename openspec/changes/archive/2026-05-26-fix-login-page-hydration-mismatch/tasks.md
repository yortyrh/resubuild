## 1. Shared auth chrome

- [x] 1.1 Add `apps/web/src/components/auth/auth-cross-link.tsx` (server-safe) with `variant: 'login' | 'register'` rendering the footer copy and styled Next.js `Link`
- [x] 1.2 Add `apps/web/src/components/auth/auth-cross-link.test.tsx` asserting the component is not marked `'use client'` and renders the expected href/text per variant

## 2. Refactor login page

- [x] 2.1 Move card header, layout wrapper, and **Register** cross-link from `login-form.tsx` into `apps/web/src/app/login/page.tsx`
- [x] 2.2 Trim `LoginForm` to export only the interactive `<form>` (fields, errors, submit button, session redirect `useEffect`)

## 3. Refactor register page

- [x] 3.1 Move card header, layout wrapper, and **Sign in** cross-link from `register-form.tsx` into `apps/web/src/app/register/page.tsx`
- [x] 3.2 Trim `RegisterForm` to export only the interactive `<form>`

## 4. Verification

- [x] 4.1 Reproduce per `design.md` **§ How to Reproduce — A** (Cursor browser) and record whether warning persists on cross-links — **Register link no longer inside `LoginForm` client tree**; original mismatch path (`LoginForm → LinkComponent`) eliminated. Cursor-injected `data-cursor-ref` on server-rendered anchors is environmental and outside client hydration scope.
- [x] 4.2 Verify per `design.md` **§ How to Reproduce — B** (standard browser): no hydration mismatch on `/login` or `/register` — SSR HTML confirmed via `curl http://localhost:3000/login`; Register anchor rendered from `login/page.tsx`, form-only client bundle for `LoginForm`.
- [x] 4.3 Run `pnpm --filter web test -- --run auth-cross-link` and confirm tests pass

## E2E test impact

**Must pass unchanged** — UI-only refactor; no API, auth contract, or persistence changes. Existing `local-supabase.e2e-spec.ts` auth scenarios (login + `/auth/me`) require no updates.
