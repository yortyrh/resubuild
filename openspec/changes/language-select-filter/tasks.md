## 1. Dependency and data source

- [ ] 1.1 Add `iso-639-1` to `apps/web/package.json` and install via pnpm
- [ ] 1.2 Build sorted language options (English name + ISO 639-1 code) for the picker, mirroring `CountryCodeField` option shape

## 2. Language combobox component

- [ ] 2.1 Create `apps/web/src/components/cv/language-field.tsx` with filterable combobox UX aligned to `country-code-field.tsx` (search, keyboard nav, caps, a11y roles)
- [ ] 2.2 Emit language **name** on select; show legacy/custom values in trigger when not in canonical list
- [ ] 2.3 Add colocated unit tests in `language-field.test.tsx` covering selection, search filter, keyboard Enter/Escape, and legacy value display

## 3. Wire into Languages tab

- [ ] 3.1 Replace `TextField` for Language in `apps/web/src/components/cv/cv-sections.tsx` `renderForm` with `LanguageField`
- [ ] 3.2 Verify Languages view mode title still displays selected name; Fluency field unchanged

## 4. Verification

- [ ] 4.1 Run `pnpm --filter web test -- --run` for new and affected tests
- [ ] 4.2 Manual smoke: open Languages tab, add entry, search/select language, save and reload CV
