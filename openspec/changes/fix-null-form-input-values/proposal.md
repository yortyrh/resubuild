## Why

This change retroactively documents work already implemented in the working tree.

Normalized CV field types allow optional strings to be `null` after API roundtrips. React controlled `<input>` and `<textarea>` elements reject `value={null}`, which surfaced as a runtime console error when editing CV sections with empty optional fields. Authors saw a broken dev overlay even though the form was otherwise usable.

## What Changes

- Coerce `null` to `''` in shared shadcn `Input` and `Textarea` wrappers when a `value` prop is provided, while leaving `undefined` uncontrolled.
- Normalize `null` at CV form field boundaries (`TextField`, comboboxes, date and country pickers) before string operations such as `.trim()`.
- Accept `string | null` on affected field component props to match normalized resume types.
- Add colocated Vitest coverage for null-safe rendering across primitives and CV form fields.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: Form controls bound to optional normalized resume strings SHALL treat `null` as empty display state without React controlled-input warnings or runtime errors on `.trim()`.

## Impact

- **Frontend**: `apps/web/src/components/ui/input.tsx`, `textarea.tsx`, `form-fields.tsx`, `iso-date-field.tsx`, `language-field.tsx`, `country-code-field.tsx`, `social-network-combobox.tsx`, and colocated `*.test.tsx` files.
- **API / DB**: No changes.
- **Tests**: Colocated Vitest only; no E2E contract changes.
