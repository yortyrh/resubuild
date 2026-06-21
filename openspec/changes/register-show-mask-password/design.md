## Context

The current register form (`apps/web/src/components/auth/register-form.tsx`) renders its password field with a plain `<Input type="password" />` from the shadcn `Input` primitive. The password is always masked, with no way for users to verify what they typed. This is the only password-bearing input on the register page; OAuth buttons are handled by separate components and do not expose a password input.

The repo already has the building blocks needed:

- `apps/web/src/components/ui/input.tsx` — shadcn `Input` (forwarded ref, styling consistent with the design system).
- `apps/web/src/components/ui/button.tsx` — shadcn `Button` with `variant="ghost"` and small size, suitable for an inline icon toggle.
- `lucide-react` — already a dependency in `apps/web`; `Eye` / `EyeOff` icons are available with no new install.

The only piece missing is a small "password input with visibility toggle" primitive, which is small enough to live next to the other shadcn wrappers in `apps/web/src/components/ui/` and to be reused later on `/login`, change-password, and reset-password pages.

## Goals / Non-Goals

**Goals:**

- Let users on `/register` toggle the masked state of the password input.
- Keep the form's behavior, validation, and submitted payload identical regardless of toggle state.
- Provide a small, reusable `PasswordInput` primitive colocated with the other shadcn wrappers.
- Stay within the existing visual design system (shadcn primitives, Tailwind utilities already in use in `register-form.tsx`).
- Ship with unit tests covering the toggle behavior.

**Non-Goals:**

- Changing the password policy, validation rules, or `minLength` attribute.
- Touching the login form, change-password, or reset-password forms (out of scope for this change; the new primitive is reusable, but adoption is a follow-up).
- Changing any backend, API, or Supabase Auth contract.
- Adding a "show strength meter" or any other password UX beyond reveal/mask.
- Persisting toggle state across navigations or reloads.

## Decisions

### 1. New `PasswordInput` component colocated with shadcn wrappers

**Decision:** Add `apps/web/src/components/ui/password-input.tsx` that wraps the existing `Input` and adds a right-aligned visibility toggle button inside a `relative` container.

**Rationale:** The existing UI components in `apps/web/src/components/ui/` follow the "one component per file, shadcn-style wrapper" convention (`input.tsx`, `button.tsx`, `label.tsx`, etc.). A new file matching that pattern keeps imports consistent (`@/components/ui/password-input`) and lets other forms adopt the primitive later without coupling to the register form.

**Alternatives considered:**

- _Inline the toggle inside `RegisterForm`._ Rejected — the toggle is a reusable affordance and inlining it would duplicate logic on the login and change-password forms later.
- _Use a generic shadcn `react-hook-form` Controller or `Field` primitive._ Rejected — the current register form uses plain `useState` and uncontrolled inputs; introducing a new form abstraction just for this would be a much larger change.

### 2. Internal toggle state (not controlled externally)

**Decision:** `PasswordInput` owns its visibility state internally with `useState<boolean>(false)` (masked by default). It accepts `value` / `onChange` props forwarded to the underlying `Input` for the password value itself, but the visibility state is not part of the public API.

**Rationale:** The toggle is a pure UI affordance — no parent component on `/register` cares whether the password is currently masked. Keeping it internal avoids prop churn and prevents accidental coupling (e.g., a parent accidentally rendering two password inputs that share a single visibility flag).

**Alternatives considered:**

- _Expose `visible` / `defaultVisible` props._ Rejected — no current caller needs it; YAGNI. Adding it later is non-breaking.
- _Force a controlled `visible` prop._ Rejected — adds boilerplate to every call site for no benefit today.

### 3. Toggle button uses `Button variant="ghost"` + Lucide icons

**Decision:** Render the toggle as an absolutely positioned `Button` (`variant="ghost"`, `size="icon"`, `type="button"`) on the right edge of the input, containing a `lucide-react` `Eye` (when masked) or `EyeOff` (when revealed) icon.

**Rationale:** Matches existing design-system primitives. `type="button"` is critical so the toggle never submits the form. `aria-label` toggles between "Show password" and "Hide password"; `aria-pressed` reflects the current state so screen readers announce the toggle correctly.

**Alternatives considered:**

- _Custom `<button>` with raw SVG._ Rejected — `lucide-react` is already a dependency, and icon consistency across the app is a design system win.
- _An `<input type="checkbox">` styled as a switch._ Rejected — overkill for a one-bit toggle and breaks the visual pattern used elsewhere.

### 4. Padding-right on the input so typed text doesn't slide under the toggle

**Decision:** Apply `pr-10` (right padding matching the icon button width) to the wrapped `Input` so the last character of the password stays visible while typing.

**Rationale:** Prevents the toggle button from visually clipping the password text. Purely a layout detail, no behavior change.

### 5. No change to form submission, validation, or Supabase payload

**Decision:** The register form continues to call `register.mutate({ email, password })` with the unchanged `password` state string. The toggle only flips the `<input type>` between `"password"` and `"text"`; it does not alter, sanitize, or persist the value.

**Rationale:** Keeps the auth contract identical — `POST /auth/register` receives the exact same payload it does today. E2E tests for credential registration continue to pass without edits.

## Risks / Trade-offs

- [Risk] _Unmasked passwords visible over the shoulder_ → Mitigation: this is the explicit purpose of the toggle; rely on standard user behavior (clicking the toggle is a deliberate action). No mitigation needed beyond clear `aria-label`.
- [Risk] _Inconsistent adoption across auth forms_ → Mitigation: deliver the primitive now, follow up by adopting it on `/login`, `/forgot-password`, and change-password screens in later changes. Out of scope here.
- [Risk] _Auto-fill / password manager behavior changes when toggled to `type="text"`_ → Mitigation: default is masked (`type="password"`); most managers re-mask on form submission or page navigation. Acceptable trade-off; same behavior as every other revealable password field on the web.
- [Risk] _Lefthook Prettier Tailwind class sort rearranges the new classes_ → Mitigation: run `pnpm format` after implementation; the sort plugin is deterministic and any reordering is cosmetic.
