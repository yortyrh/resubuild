## Why

The CV editor's view mode was shaped around a sparse MIT-style sample resume, so many JSON Resume fields that users can save in edit forms never appear in read-only preview rows. Authors cannot verify persisted data without entering edit mode, and imported or API-populated CVs look incomplete even when the data is stored correctly. Every tab should surface all schema-backed fields that the editor already supports in forms.

## What Changes

- Audit every CV editor tab (Basics, Social profiles, Work, Volunteer, Education, Skills, Projects, Awards, Certificates, Publications, Languages, Interests, References) against `@resumind/types` and the shared JSON Resume schema.
- Extend **view-mode** `renderView` output in `cv-sections.tsx` and `managed-basics-section.tsx` so every field editable in the corresponding form is also visible when the row is collapsed.
- Document a field coverage matrix (form field → view placement) as the acceptance baseline for the audit.
- Known gaps today (form supported, view missing):
  - **Work**: `url`, `description`
  - **Volunteer**: `url`
  - **Education**: `url`, `score`
  - **Projects**: `url`, `entity`, `type`
  - **Awards**: `awarder`
  - **Certificates**: `url`
  - **Publications**: `url`, `summary`
- Apply consistent resume-preview placement: URLs in meta or body (aligned with `clickable-links-new-tab` when merged), scalar secondary fields in `meta`, prose/markdown in `body`, structured lists unchanged.
- Add colocated Vitest coverage asserting representative sections render all non-empty persisted fields in view mode.

## Capabilities

### New Capabilities

<!-- None — field visibility within existing CV editor UI -->

### Modified Capabilities

- `cv-editor-ui`: View-mode resume-preview rows SHALL display every JSON Resume field that the editor exposes in the corresponding edit form for that section; no form-backed field may be omitted from view mode when it holds a value.

## Impact

- **Frontend**: `apps/web/src/components/cv/cv-sections.tsx`, `managed-basics-section.tsx`; optional small shared helpers for repeated view fragments (URL line, labeled scalar).
- **Tests**: Colocated Vitest tests beside updated components or a dedicated field-coverage test module.
- **No API, schema, or database changes**.
- **Related changes**: Complements `clickable-links-new-tab` (URL presentation), `markdown-view-rendering` (markdown fields in view), and `basics-profile-photo` / `basics-address-contact-line` (Basics-specific layout). This change focuses on completeness of field visibility across all tabs.
