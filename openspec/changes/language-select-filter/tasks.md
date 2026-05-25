## 1. Dependency and data source

- [x] 1.1 Add `iso-639-1` to `apps/web/package.json` and install via pnpm
- [x] 1.2 Build sorted language options (English name + ISO 639-1 code) for the picker, mirroring `CountryCodeField` option shape

## 2. Language combobox component

- [x] 2.1 Create `apps/web/src/components/cv/language-field.tsx` with filterable combobox UX aligned to `country-code-field.tsx` (search, keyboard nav, caps, a11y roles)
- [x] 2.2 Emit language **name** on select; show legacy/custom values in trigger when not in canonical list
- [x] 2.3 Add colocated unit tests in `language-field.test.tsx` covering selection, search filter, keyboard Enter/Escape, and legacy value display

## 3. Wire into Languages tab

- [x] 3.1 Replace `TextField` for Language in `apps/web/src/components/cv/cv-sections.tsx` `renderForm` with `LanguageField`
- [x] 3.2 Verify Languages view mode title still displays selected name; Fluency field unchanged

## 4. Verification

- [x] 4.1 Run `pnpm --filter web test -- --run` for new and affected tests
- [x] 4.2 Manual smoke: open Languages tab, add entry, search/select language, save and reload CV
