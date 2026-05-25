## Context

`CvSections` (`apps/web/src/components/cv/cv-sections.tsx`) renders fourteen resume sections using shadcn/Radix horizontal `Tabs` with `defaultValue="basics"`. Tab state is entirely client-local; reloading `/dashboard/cv/[id]` always lands on Basics regardless of what the author was editing. The tab strip wraps on narrow viewports and competes for horizontal space with long section labels (e.g. **Social profiles**, **Certificates**).

The edit route today is a single page at `apps/web/src/app/dashboard/cv/[id]/page.tsx` with no nested segments. Dashboard links (`/dashboard/cv/${cv.id}`) should continue to work as the Basics entry point.

## Goals / Non-Goals

**Goals:**

- Persistent left navigation listing all CV sections on md+ viewports.
- Mobile-friendly left drawer exposing the same section list, with a visible trigger when the drawer is closed.
- URL-backed active section: `/dashboard/cv/[id]` → Basics; `/dashboard/cv/[id]/[section]` → matching section.
- Reload and direct URL access restore the correct section content.
- Preserve all existing section editors and CRUD behavior inside the content pane.

**Non-Goals:**

- Changing section field layouts, preview rows, or API contracts.
- Adding section-level query params (e.g. `?tab=work`) — path segments only.
- Deep-linking to individual entries within a section (e.g. `/work/2`).
- Breadcrumb or dashboard-wide sidebar redesign outside the CV editor shell.

## Decisions

### 1. Route shape: optional `[section]` dynamic segment

**Choice:** Add `apps/web/src/app/dashboard/cv/[id]/[section]/page.tsx` reusing the same client shell, and keep `[id]/page.tsx` as the Basics route (no redirect required).

**Rationale:** User requirement: "basics is the one open when no path in the URL." A dedicated index route avoids redirect churn and keeps existing `/dashboard/cv/[id]` links valid.

**Alternative considered:** `[[...section]]` catch-all — rejected because it complicates static param validation and offers no benefit over a single optional segment.

### 2. Canonical section slugs

**Choice:** Centralize slugs in `cv-section-nav.ts`:

| Slug             | Label           |
| ---------------- | --------------- |
| _(none / index)_ | Basics          |
| `profiles`       | Social profiles |
| `work`           | Work            |
| `volunteer`      | Volunteer       |
| `education`      | Education       |
| `skills`         | Skills          |
| `projects`       | Projects        |
| `awards`         | Awards          |
| `certificates`   | Certificates    |
| `publications`   | Publications    |
| `languages`      | Languages       |
| `interests`      | Interests       |
| `references`     | References      |

Slugs align with current Radix `TabsTrigger` `value` props to minimize content refactor.

**Invalid slug handling:** Client-side `notFound()` or `redirect` to `/dashboard/cv/[id]` when `[section]` is not in the allowlist.

### 3. Navigation component: `CvSectionNav` + layout shell

**Choice:** New `cv-section-nav.tsx` exports:

- `CV_SECTIONS` config (slug, label, optional `indexOnly: true` for Basics)
- `CvSectionNav` — vertical nav list using Next.js `Link` with active styling via `usePathname()`
- `CvSectionLayout` — flex container: sidebar (hidden below md) + scrollable main content

**Rationale:** Decouples routing from the large `CvSections` content tree; tests can target slug helpers independently.

### 4. Mobile drawer via shadcn `Sheet`

**Choice:** Install `@/components/ui/sheet` (Radix Dialog-based, slides from left). Below `md`, hide the fixed sidebar; show a **Sections** button (icon + label) that opens `Sheet` with the same `CvSectionNav` links. Selecting a link closes the sheet via `onOpenChange`.

**Alternative considered:** Radix `DropdownMenu` — rejected; user asked for left-side drawer, and Sheet matches that pattern.

### 5. Replace Radix Tabs with route-driven content switch

**Choice:** Remove `Tabs`/`TabsList`/`TabsTrigger` wrapper. Render section bodies conditionally from `activeSection` prop (derived from route). Only one section mounts at a time (same as Radix Tabs default unmount behavior).

**Rationale:** Tabs controlled state duplicates URL state; `Link` navigation is the single source of truth.

### 6. Pass `section` from page to editor

**Choice:** Extend `EditCvPageClient` and `CvEditor` with optional `section?: CvSectionSlug`; thread into `CvSections`.

**Rationale:** Keeps data fetching in the page client; `CvSections` stays presentation-focused.

### 7. Active link styling

**Choice:** Nav items use `aria-current="page"` when active; Tailwind classes mirror shadcn sidebar patterns (`bg-accent`, `font-medium`). Basics active when pathname ends with `/cv/[id]` with no further segment.

## Risks / Trade-offs

- **[Risk] Full page navigation on section change** → **Mitigation:** Next.js client-side `Link` transitions preserve React state in parent layout if a shared layout is introduced later; for now remounting `EditCvPageClient` on section change is acceptable because CV data is loaded once per `[id]` — consider lifting fetch to `[id]/layout.tsx` in a follow-up if flicker appears.
- **[Risk] Invalid bookmarks** → **Mitigation:** Allowlisted slugs + redirect to Basics index.
- **[Risk] Sheet not yet in UI kit** → **Mitigation:** Add via shadcn CLI during implementation; standard dependency.
- **[Risk] Long sidebar scroll on small laptop heights** → **Mitigation:** Sidebar `overflow-y-auto` with sticky section header showing current CV context.

## Migration Plan

Frontend-only deploy. No feature flag.

1. Add `[section]` route and nav config.
2. Refactor `CvSections` to layout + conditional content.
3. Add Sheet for mobile.
4. Verify existing `/dashboard/cv/[id]` links open Basics.
5. Rollback: revert route folder and component changes.

## Open Questions

- Optional follow-up: shared `[id]/layout.tsx` to avoid refetching CV JSON on every section navigation.
- Optional follow-up: highlight sidebar item when section has validation errors.
