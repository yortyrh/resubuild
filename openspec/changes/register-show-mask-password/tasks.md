## 1. Add the PasswordInput primitive

- [ ] 1.1 Create `apps/web/src/components/ui/password-input.tsx` exporting a `PasswordInput` React component that forwards `InputHTMLAttributes<HTMLInputElement>` (including a forwarded `ref`) to the existing shadcn `Input` (`@/components/ui/input`).
- [ ] 1.2 Wrap the `Input` in a `div.relative` and add `pr-10` to the `Input` so typed text does not slide under the toggle button.
- [ ] 1.3 Manage visibility with internal `useState<boolean>(false)` (masked by default); toggle the underlying input's `type` between `"password"` and `"text"`.
- [ ] 1.4 Render the toggle as a shadcn `Button` (`variant="ghost"`, `size="icon"`, `type="button"`, absolutely positioned on the right) containing a `lucide-react` `Eye` icon when masked and `EyeOff` when revealed.
- [ ] 1.5 Set `aria-label` to "Show password" / "Hide password" and `aria-pressed` to reflect the current state.

## 2. Unit tests for PasswordInput

- [ ] 2.1 Create `apps/web/src/components/ui/password-input.test.tsx` colocated with the component (Vitest + React Testing Library, matching the conventions in `apps/web/src/components/ui/input.test.tsx`).
- [ ] 2.2 Assert that, by default, the underlying input has `type="password"` and the toggle is labeled "Show password".
- [ ] 2.3 Assert that clicking the toggle flips the input `type` to `"text"`, changes the label to "Hide password", and sets `aria-pressed="true"`.
- [ ] 2.4 Assert that clicking the toggle a second time returns the input `type` to `"password"`.
- [ ] 2.5 Assert that typing then revealing does not transform or alter the submitted string (controlled `value` stays exactly what was typed).
- [ ] 2.6 Run `pnpm --filter web test -- --run src/components/ui/password-input.test.tsx`.

## 3. Wire PasswordInput into the register form

- [ ] 3.1 In `apps/web/src/components/auth/register-form.tsx`, replace the password `<Input ... type="password" ... />` with `<PasswordInput ... />`, preserving `id="password"`, `autoComplete="new-password"`, `required`, `minLength={6}`, `value`, and `onChange`.
- [ ] 3.2 Confirm the import path `@/components/ui/password-input` resolves and no other imports change.
- [ ] 3.3 Verify the rest of the register form (email field, OAuth buttons, error/success rendering, submit handler calling `register.mutate({ email, password })`) is unchanged.

## 4. Register form tests

- [ ] 4.1 Extend `apps/web/src/components/auth/register-form.test.tsx` with a test asserting the password input starts as `type="password"` on `/register`.
- [ ] 4.2 Add a test asserting that clicking the toggle reveals the password (`type="text"`) and that the input still contains the typed value.
- [ ] 4.3 Add a test asserting that submitting the form invokes `useRegister` with `{ email, password }` where `password` is the exact typed string (visibility toggled on at submit time).
- [ ] 4.4 Run `pnpm --filter web test -- --run src/components/auth/register-form.test.tsx`.

## 5. Verification

- [ ] 5.1 Run `pnpm --filter web lint` and `pnpm --filter web typecheck` to confirm no Biome / TS regressions.
- [ ] 5.2 Run `pnpm --filter web test -- --run` for the full web unit suite.
- [ ] 5.3 Run `pnpm format` so the Prettier Tailwind class-sort plugin orders any new utility classes consistently.
- [ ] 5.4 Manually smoke-test `/register`: load the page, type a password, click the eye icon, confirm the value becomes visible; click again, confirm it re-masks; submit, confirm the account creation flow still works end-to-end against local Supabase.

## E2E test impact

### Must pass unchanged

- `apps/api/test/e2e/local-supabase.e2e-spec.ts` — registration, login, and session introspection scenarios that exercise `POST /auth/register` and `GET /auth/me` against the local Supabase stack. The toggle is a purely client-side affordance; the wire payload to `POST /auth/register` is byte-identical to today.

### Update required

- None — no API, Supabase, RLS, auth, or persistence contract changes.

### Add

- None — UI-only change. A follow-up change can adopt the same `PasswordInput` primitive on the login, forgot-password, and change-password forms, but those are out of scope here.
