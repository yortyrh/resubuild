## ADDED Requirements

### Requirement: The web app SHALL provide a reusable password input with a reveal toggle

The web app MUST expose a `PasswordInput` component at `apps/web/src/components/ui/password-input.tsx` that wraps the existing shadcn `Input` primitive and renders a right-aligned visibility toggle inside the input area. The component MUST default to masked (`type="password"`) and MUST toggle to `type="text"` when the user activates the toggle.

The component MUST accept and forward the standard `Input` props (`value`, `onChange`, `name`, `placeholder`, `autoComplete`, `required`, `minLength`, `maxLength`, `disabled`, `className`, and a forwarded `ref`) so it is a drop-in replacement for `Input` in any password-bearing form.

The toggle button MUST be a `<button type="button">` so it never submits a surrounding form, MUST have an `aria-label` that reads "Show password" when masked and "Hide password" when revealed, and MUST set `aria-pressed` to reflect the current state. The toggle MUST render a `lucide-react` `Eye` icon when masked and `EyeOff` icon when revealed.

The visibility state MUST be owned internally by the component. The submitted password value MUST be the exact string the user typed, regardless of whether the input is currently masked or revealed.

#### Scenario: Default state is masked

- **WHEN** the user renders `<PasswordInput />` with no `defaultVisible` prop
- **THEN** the underlying `<input>` element has `type="password"`
- **AND** the toggle's `aria-label` is "Show password"
- **AND** the toggle's `aria-pressed` is `false`

#### Scenario: Clicking the toggle reveals the password

- **WHEN** the user clicks the toggle while the input is masked
- **THEN** the underlying `<input>` element's `type` becomes `"text"`
- **AND** the toggle's `aria-label` becomes "Hide password"
- **AND** the toggle's `aria-pressed` becomes `true`

#### Scenario: Clicking the toggle again re-masks the password

- **WHEN** the user clicks the toggle while the input is revealed
- **THEN** the underlying `<input>` element's `type` returns to `"password"`
- **AND** the toggle's `aria-label` returns to "Show password"
- **AND** the toggle's `aria-pressed` becomes `false`

#### Scenario: Submitted value is unaffected by toggle state

- **WHEN** the user types `"hunter2"` into a `<PasswordInput />` and submits the surrounding form while the input is revealed
- **THEN** the form submits with `password: "hunter2"`
- **AND** no extra fields, transformations, or visibility metadata are added to the payload

### Requirement: The register form SHALL use the password reveal primitive

The register page (`apps/web/src/app/auth/register` route) MUST render its password field using `<PasswordInput />` instead of `<Input type="password" />`. The toggle MUST be available to the user, MUST default to masked, and MUST NOT alter the value submitted to `useRegister`.

The form's other behavior — required attribute, `minLength={6}`, `autoComplete="new-password"`, the email field, OAuth buttons, error/success rendering, and submission flow — MUST remain unchanged.

#### Scenario: User can reveal the password while registering

- **WHEN** the user lands on `/register` and focuses the password input
- **THEN** the password field is masked (`type="password"`) and a "Show password" toggle is visible at the right edge of the input
- **AND** clicking the toggle reveals the typed password without changing the value held in the form's React state

#### Scenario: Registration still submits the typed password

- **WHEN** the user enters an email and password on `/register`, toggles the visibility on, then submits the form
- **THEN** `useRegister` is invoked with `{ email, password }` where `password` equals the typed string
- **AND** the request to the authentication backend is identical to the previous behavior
