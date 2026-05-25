## Why

The CV editor currently renders all section tabs in a horizontal strip that wraps on smaller viewports. That layout consumes vertical space, scales poorly across fourteen sections, and offers no shareable or restorable navigation state on reload. A persistent left navigation with URL-backed section selection improves scanability on desktop and tablet, keeps mobile usable via a drawer, and lets authors bookmark or refresh a specific section.

## What Changes

- Replace the horizontal `TabsList` in `CvSections` with a **left sidebar navigation** on desktop and tablet (md breakpoint and up).
- On mobile (below md), expose the same section list in a **left-side drawer** opened from a menu control; selecting a section closes the drawer and shows that section's content.
- Drive the active section from the **URL path** under `/dashboard/cv/[id]`: no extra segment means **Basics**; `/dashboard/cv/[id]/work`, `/dashboard/cv/[id]/profiles`, etc. map to the corresponding section slug.
- Invalid or unknown section slugs SHALL redirect or fall back to Basics (or show a not-found treatment consistent with the app).
- Section content area remains on the right (or full width on mobile when drawer is closed); only the navigation chrome changes.
- Browser reload and direct navigation SHALL restore the selected section from the URL without client-only state loss.

## Capabilities

### New Capabilities

<!-- None — navigation layout and routing are refinements within the existing CV editor -->

### Modified Capabilities

- `cv-editor-ui`: Section navigation SHALL use a left sidebar on desktop/tablet and a left drawer on mobile; the active section SHALL be reflected in and restored from the URL path, with Basics as the default when no section segment is present.

## Impact

- **Frontend routing**: `apps/web/src/app/dashboard/cv/[id]/` — optional catch-all or nested `[section]` route; update links from dashboard CV list if they should land on a specific section (default remains `/dashboard/cv/[id]`).
- **Frontend components**: `apps/web/src/components/cv/cv-sections.tsx` (major layout refactor); new sidebar/drawer shell component(s); possible `Sheet` UI primitive from shadcn/ui if not already present.
- **Tests**: Colocated Vitest tests for slug validation, default-to-basics behavior, and navigation link generation.
- **No API, schema, or database changes**.
