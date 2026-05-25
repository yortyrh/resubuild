## Why

The Languages tab currently uses a plain text input for the language name, which invites typos, inconsistent spelling (e.g. "english" vs "English"), and offers no guidance on valid choices. The Basics country field already uses an accessible filterable combobox backed by a canonical list; language entry should follow the same pattern for consistency and data quality.

## What Changes

- Replace the Languages tab **Language** free-text `TextField` with a filterable combobox matching the country picker interaction model (button trigger, searchable dropdown, keyboard navigation, click-outside close).
- Populate options from a canonical language name list (ISO 639-1 aligned, English display names).
- Persist the selected **language name** string in `resume.languages[].language` per JSON Resume schema (not a separate code field).
- Display existing saved values that are not in the canonical list as the current selection label (backward compatible with imported or legacy CVs).
- Leave **Fluency** as a free-text field unchanged.

## Capabilities

### New Capabilities

<!-- None — UX refinement within existing CV editor -->

### Modified Capabilities

- `cv-editor-ui`: Languages section edit form SHALL use a searchable language combobox instead of a plain text input for the `language` field.

## Impact

- **Frontend**: `apps/web/src/components/cv/cv-sections.tsx` (Languages `renderForm`); new `LanguageField` component (or shared combobox extracted from `CountryCodeField`); optional dependency such as `languages-list` or `iso-639-1` in `apps/web/package.json`.
- **Tests**: Component tests for language picker selection, search filtering, and legacy value display.
- **No API, schema, or database changes** — stored shape remains `language?: string`.
