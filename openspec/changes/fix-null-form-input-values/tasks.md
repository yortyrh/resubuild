## 1. Shared primitives

- [x] 1.1 Coerce `null` to `''` in `apps/web/src/components/ui/input.tsx` when `value` is defined
- [x] 1.2 Coerce `null` to `''` in `apps/web/src/components/ui/textarea.tsx` when `value` is defined
- [x] 1.3 Add colocated Vitest in `input.test.tsx` and `textarea.test.tsx`

## 2. CV form field boundaries

- [x] 2.1 Normalize `null` in `TextField` (`form-fields.tsx`) and accept `string | null` prop
- [x] 2.2 Normalize `null` in `IsoDateField`, `LanguageField`, `CountryCodeField`, `SocialNetworkCombobox`
- [x] 2.3 Extend `form-fields.test.tsx`, `language-field.test.tsx`, `social-network-combobox.test.tsx`
- [x] 2.4 Add `country-code-field.test.tsx` and `iso-date-field.test.tsx`

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth, CV CRUD, editor flows, export, import

### Update required

- None

### Add

- None — UI-only null coercion covered by colocated Vitest
