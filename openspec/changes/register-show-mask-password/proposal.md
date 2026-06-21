## Why

Users registering on `/register` currently cannot see what they type in the password field — every keystroke is masked behind `type="password"`. Typos in a password are easy to make and hard to spot, leading to failed sign-ups, abandoned flows, and avoidable support friction. A standard accessibility-friendly reveal control fixes this without changing any security or auth contract.

This change brings the register form in line with how nearly every public sign-up form behaves today, and gives the team a small, reusable primitive (`PasswordInput`) so future surfaces (login, change-password, reset-password) can adopt the same affordance cheaply.

## What Changes

- Add a new `PasswordInput` component (`apps/web/src/components/ui/password-input.tsx`) that wraps the existing shadcn `Input` with a right-aligned visibility toggle (eye / eye-off icon).
- Wire `PasswordInput` into the password field on the **register form** so the user can reveal or mask the password value at will.
- Default state stays masked (`type="password"`) — no behavior change for users who never click the toggle.
- The toggle is purely local UI state; it does not alter the submitted value, validation, or any auth payload.
- Add unit tests covering the register form's new toggle interaction (masked by default, click reveals, second click re-masks, submitted value is unaffected).

## Capabilities

### New Capabilities

- `auth-password-input-visibility`: Reusable `PasswordInput` UI primitive + register-form integration that lets the user toggle the masked state of a password input without changing the submitted value, validation, or auth contract.

### Modified Capabilities

- `authentication`: No requirement-level changes. The credential signup flow, payloads, and Supabase Auth integration are unchanged — only the register form's password input gains a client-side reveal affordance. Leaving this out of "Modified Capabilities" to keep the spec focused on the existing contract; the new capability above owns the UI requirement.

## Impact

- **Code**:
  - `apps/web/src/components/ui/password-input.tsx` (new)
  - `apps/web/src/components/ui/password-input.test.tsx` (new)
  - `apps/web/src/components/auth/register-form.tsx` (replace the password `Input` with `PasswordInput`)
  - `apps/web/src/components/auth/register-form.test.tsx` (extend existing tests for toggle interaction)
- **API / Auth contract**: none.
- **Dependencies**: adds `lucide-react` icons (`Eye`, `EyeOff`) if not already in use — confirm and reuse existing `lucide-react` dependency present in `apps/web`.
- **E2E tests**: none — UI-only change.
