## Why

Keywords on Skills, Interests, and Projects are edited as pill-shaped tags via `TagsInput`, but view mode renders them as comma-separated plain text (`React, TypeScript, Node.js`). This mismatch makes keywords harder to scan and breaks visual consistency between edit and preview states.

## What Changes

- Add a read-only tag list component that reuses the same pill styling as `TagsInput` but omits the remove button and input field.
- Replace comma-separated keyword text in Skills, Interests, and Projects view rows with the read-only tag list.
- Keep Projects keyword label prefix (`Keywords:`) only if needed for clarity; tags themselves carry the visual weight.
- Add colocated unit tests asserting keywords render as styled tag pills, not joined strings.
- No form-mode, API, schema, or data-shape changes.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: Skills, Interests, and Projects keyword view rendering SHALL use read-only tag pills matching `TagsInput` styling (without delete controls), replacing comma-separated plain text.

## Impact

- **Frontend**: `apps/web/src/components/cv/cv-sections.tsx` (Skills, Interests, Projects `renderView`); new `TagsList` (or similar) component colocated with `tags-input.tsx`.
- **Tests**: Component or section coverage test asserting tag markup for keyword arrays.
- **No backend, schema, or dependency changes**.
