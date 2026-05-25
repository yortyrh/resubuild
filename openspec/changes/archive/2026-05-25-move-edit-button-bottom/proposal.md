## Why

The Basics tab is the only CV section that places the **Edit** button in the header top-right (`actionsPlacement="header"`). Every other section (Work, Education, Skills, etc.) uses the bottom action bar. That inconsistency makes Basics feel like a special case and misaligns with the shared `ResumeItemRow` default the rest of the editor follows.

## What Changes

- Move the Basics view-mode **Edit** button from the header top-right to the bottom action bar, matching Work and other repeatable sections.
- Remove `actionsPlacement="header"` from `ManagedBasicsSection`.
- Update the `cv-editor-ui` spec to require bottom placement for Basics Edit (replacing the header-top-right requirement added in `basics-address-contact-line`).
- Optionally remove the `actionsPlacement` prop from `ResumeItemRow` if no callers remain after this change.

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cv-editor-ui`: Basics view-mode Edit placement SHALL match other sections (bottom action bar), not header top-right.

## Impact

- **Frontend**: `apps/web/src/components/cv/managed-basics-section.tsx` (remove header placement); possibly `apps/web/src/components/cv/cv-item-ui.tsx` (remove unused `actionsPlacement` prop).
- **Tests**: Update any Basics view-mode tests that assert header Edit placement.
- **No API, schema, or database changes**.
