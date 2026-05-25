## Context

The Languages tab in `cv-sections.tsx` renders each language entry via `ManagedArraySection` with a plain `TextField` for `language` and another for `fluency`. JSON Resume stores `language` as a human-readable string (e.g. `"English"`), not a structured code.

The Basics tab already ships `CountryCodeField` — a client-side combobox with search, keyboard navigation, capped initial results, and `countries-list` as the canonical data source. Authors expect the same discoverable picker UX for languages.

## Goals / Non-Goals

**Goals:**

- Provide a filterable language combobox in the Languages edit form, matching country picker interaction and accessibility patterns.
- Source options from a maintained canonical list (ISO 639-1 English names).
- Persist selected values as the language **name** string in `resume.languages[].language`.
- Support legacy/imported CVs whose stored language string is not in the list (show as current value; allow re-selection).

**Non-Goals:**

- Changing JSON Resume schema or adding a separate `languageCode` field.
- Converting Fluency to a fixed enum or picker.
- Refactoring `CountryCodeField` into a generic combobox in this change (optional follow-up).
- Localizing language names to the user's locale.

## Decisions

### 1. New `LanguageField` component mirroring `CountryCodeField`

**Choice:** Add `apps/web/src/components/cv/language-field.tsx` following the same structure as `country-code-field.tsx` (combobox role, search input, arrow keys, Enter/Escape, click-outside).

**Rationale:** Keeps the change scoped; country picker has country-specific display (code + name). Language picker shows name primary with optional ISO code in the list for disambiguation.

**Alternative considered:** Extract a shared `SearchableCombobox` — cleaner long-term but wider diff; defer unless duplication becomes painful.

### 2. Data source: `iso-639-1` npm package

**Choice:** Add `iso-639-1` to `apps/web` and build sorted options from `ISO6391.getAllNames()` (or `getLanguages()` for code + name pairs).

**Rationale:** Well-maintained, zero deps, maps directly to ISO 639-1 codes for search; English names match JSON Resume examples. `languages-list` exists but is less widely used than `iso-639-1`.

**Alternative considered:** `languages-list` (same author as `countries-list`) — viable but less documented API; `iso-639-1` is sufficient.

### 3. Stored value = display name, not ISO code

**Choice:** `onChange` emits the English language name (e.g. `"English"`), stored in `language`.

**Rationale:** JSON Resume schema documents `"e.g. English, Spanish"` as free text; resume export/preview expects readable names. ISO code may appear in the dropdown for search only.

**Alternative considered:** Store ISO 639-1 code — would break schema expectations and existing CV data.

### 4. Legacy / custom values

**Choice:** If `value` is non-empty and not found in the canonical list, show it as the button label (same as country picker shows raw code for unknown codes). User can search and pick a canonical name to normalize.

**Rationale:** No data migration; imported CVs keep working.

### 5. Performance caps

**Choice:** Reuse country picker constants pattern: show first ~64 languages when closed/open without query; cap search results at ~120; filter by name and ISO code substring.

**Rationale:** ~180 ISO 639-1 entries — small enough that caps mainly keep first-open snappy and match existing UX copy pattern.

## Risks / Trade-offs

| Risk                                         | Mitigation                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Duplicate ISO names (e.g. regional variants) | Show ISO code in list rows; search matches code                                                         |
| Authors want dialects not in ISO 639-1       | Legacy value display preserves custom strings; optional future "custom entry" escape hatch out of scope |
| UI duplication vs country field              | Document follow-up to extract shared combobox if a third picker appears                                 |
| Bundle size from language list               | `iso-639-1` is ~37 KB unpacked; acceptable for editor-only client bundle                                |

## Migration Plan

No migration. Deploy frontend-only; existing `language` strings unchanged. Authors editing entries will see picker on next edit.

## Open Questions

- None blocking — Fluency remains free text; no API changes required.
