## Why

In the Basics tab view mode, structured location (city, region, postal code, country) and optional street address render in the top-right `meta` column, separate from the contact line (email • phone • website) under the name. This splits related contact/location information and does not match how authors expect to scan basics at a glance—address should sit with other contact details directly under the name. The Edit action also sits at the bottom-left of the row, far from the name block; it should align top-right with the header row for quicker access and visual balance once location leaves that column.

## What Changes

- Move formatted location and optional street address from the `ResumeItemRow` `meta` slot into the contact line beneath the name in Basics view mode.
- Display location as part of the same bullet-separated contact row as email, phone, and website when present.
- Move the Basics **Edit** button from the bottom of the row to the **top-right**, aligned with the name/label header row.
- Repurpose the top-right header area for the Edit action instead of location meta (Basics has no delete action).
- Preserve edit-form field order and API/data shape (`basics.location.*`); this is a read/preview layout change only.

## Capabilities

### New Capabilities

<!-- None — layout refinement within existing CV editor UI -->

### Modified Capabilities

- `cv-editor-ui`: Basics view-mode preview SHALL group location and optional address with email, phone, and website in the contact line under the name instead of the right-aligned meta column; Basics Edit action SHALL render top-right in the header row.

## Impact

- **Frontend**: `apps/web/src/components/cv/managed-basics-section.tsx` (view-mode contact/location rendering and Edit placement); `apps/web/src/components/cv/cv-item-ui.tsx` (optional `ResumeItemRow` prop for header-aligned actions, scoped to Basics).
- **Tests**: Any component or snapshot tests covering Basics preview layout (if present).
- **No API, schema, or database changes**.
