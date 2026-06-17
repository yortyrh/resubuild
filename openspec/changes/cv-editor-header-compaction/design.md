## Context

The CV editor page (`/dashboard/cv/[id]/...`) renders a persistent header row across every section route. That row carries:

1. The breadcrumb trail (`CvEditorBreadcrumb` or `CvApplicationEditorBreadcrumb`), which itself renders:
   - `My CVs` link
   - The derived CV title (short form on narrow, full form on wider)
   - The active section name (when not on Basics)
   - A trailing `<h1 data-testid="cv-page-title">{section}</h1>` _underneath_ the breadcrumb row — a duplicate heading.
2. The collapse/expand toggle for the section sidebar (`md+`).
3. The Export dropdown and Preview link (`CvEditorHeaderActions`).

The same page also opens a mobile section-nav drawer (`< SheetContent id="cv-section-nav-drawer">` rendered by `CvSectionLayout`) which carried a full `SheetHeader` (visible title + description), the Sheet's native close button, and a visible scrollbar in a 288px-wide surface. The drawer preview-page variant (`cv-layout-panel-drawer`, `/dashboard/cv/[id]/preview`) shared only the class names but not the chrome.

Between the `sm` (640px) and `lg` (1024px) breakpoints the row crowded: the `cv-page-title` H1 added vertical height, the short/full title flipped at `sm` (too early for the available width), and the Export/Preview labels stayed visible at `sm`+ — wrapping the row at typical laptop widths (768–1024px).

The visual design system has been steadily moving toward semantic CSS-variable tokens in `apps/web/src/app/globals.css`, so any new utility class lives there rather than as a one-off.

## Goals / Non-Goals

**Goals:**

- Eliminate the duplicate page title in the CV editor breadcrumb.
- Hide the mobile drawer scrollbar so the 288px surface reads as a single column of nav links.
- Hide the mobile drawer's native close button and `SheetHeader` chrome — the breadcrumb row already owns the toggle.
- Bump the short/full CV title responsive threshold to `md` (768px) so the full title appears at typical laptop widths.
- Bump the Export/Preview label threshold to `lg` (1024px) so the header row stays icon-only from `sm`–`lg`, with labels reappearing on `lg+`.
- Keep every existing accessible name, focus order, and `aria-current` behavior intact.

**Non-Goals:**

- Restructuring the section-nav drawer (still a `Sheet` overlay).
- Adding new controls or moving the collapse/expand toggle.
- Touching the dashboard chrome (My CVs page) or the application workspace breadcrumb.
- Changing the preview iframe toolbar.

## Decisions

### Drop the redundant `cv-page-title` `<h1>` from the breadcrumb components

The active section name already lives inside the breadcrumb's terminal `BreadcrumbPage` segment, where it's styled as the current page (semantically the right home for it). Rendering a second `<h1 data-testid="cv-page-title">` below the row duplicates the heading hierarchy (the breadcrumb is a `<nav>`, the page title was the document's `H1`) and adds vertical height at the worst spot — directly above the section content.

- **Decision:** Remove the trailing `<h1>` from `CvEditorBreadcrumb` and `CvApplicationEditorBreadcrumb` along with the surrounding wrapper `<div className="space-y-1">`. The breadcrumb becomes the single source of truth for the section name.
- **Alternative considered:** Keep the H1 but style it smaller (e.g. `text-base`). Rejected — it still duplicates the breadcrumb label and the existing `BreadcrumbPage` typography is already an adequate page header in this context.

### Bump `CvTitleDisplay` short/full threshold to `md`

`sm` (640px) is too narrow for the derived title (`Jane Doe — Senior Software Engineer`) on a row that already carries `My CVs`, the toggle, and two action buttons. `md` (768px) is the natural breakpoint — the CV editor's `md` is the same threshold that introduces the persistent sidebar (`CvSectionLayout` uses `md+` for the sidebar).

- **Decision:** Swap `sm:hidden` ↔ `sm:inline` → `md:hidden` ↔ `md:inline` in `CvTitleDisplay`. Update the related Vitest assertion.
- **Alternative considered:** Keep `sm` and shrink the full title at `sm` instead. Rejected — the existing derivation already trims gracefully, and aligning the threshold with the section-nav layout keeps the layout model consistent.

### Hide the drawer scrollbar and Sheet chrome

The mobile section-nav drawer is 288px wide (Tailwind `w-72`). On a phone, the native scrollbar plus the 14px gutter consumes ~6% of the width — enough to push a 13-item nav list into wrapping. Hiding the scrollbar visually keeps keyboard, trackpad, and drag-to-scroll working.

- **Decision:** Add a global `.scrollbar-hidden` utility (cross-browser: `scrollbar-width: none`, `-ms-overflow-style: none`, and `::-webkit-scrollbar { display: none }`) and apply it to the drawer's inner scrollable region.
- **Decision:** Hide the Sheet's native close button via `[&>button]:hidden` on `SheetContent`. The toggle button in the breadcrumb row is the only entry point, so the close button is redundant (and tapping the overlay still closes via Radix). Replace the visible `SheetHeader`/`SheetDescription` with an `sr-only` `SheetTitle` so screen readers still announce the dialog.
- **Alternative considered:** Drop the `Sheet` primitive entirely in favor of a plain left drawer. Rejected — Radix `Sheet` already provides the focus trap, ESC-to-close, and overlay dismissal we need; the chrome is the only thing to strip.

### Bump Export/Preview visible labels to `lg`

On `sm`–`lg` viewports the labels visually crowd the breadcrumb and force row wrapping. Both controls already expose `aria-label`, so hiding the visible label is a visual change only.

- **Decision:** Swap `sm:mr-1.5` → `lg:mr-1.5` and `hidden sm:inline` → `hidden lg:inline` on the Download `Export` trigger and the `Preview` link. Update the related Vitest assertion.
- **Alternative considered:** Keep `sm` but compress the gap. Rejected — the row needs the icon-only affordance, not a smaller affordance.

## Risks / Trade-offs

- **[Risk] The breadcrumb's `BreadcrumbPage` carries the section name; users who relied on the larger `text-2xl` H1 for visual prominence lose that emphasis.** → The `BreadcrumbPage` text is already semibold and medium-sized; the editor page heading remains effective as the current-page segment. The preview route (`/dashboard/cv/[id]/preview`) does not render the editor breadcrumb, so its `Preview` H1 in the breadcrumb is unaffected.
- **[Risk] Hidden scrollbar reduces discoverability of the long nav list (13 sections).** → The list is short enough to fit on most phones; when it overflows, scroll snap and momentum still work. The toggle button remains the single entry point, which keeps the affordance consistent.
- **[Risk] `lg` threshold for the Export/Preview labels is too late for some users on `md` laptops who prefer labels.** → This is an intentional compaction; users on `md` already had the row wrap, so labels _hidden_ is strictly better than labels _causing a wrap_. The accessible name is unchanged.

## Migration Plan

This is a frontend-only change with no data migration. Deploy by merging to `main`; no environment configuration or feature flag is required. Rollback is `git revert` of the implementation commit (`feat(cv): ...`); the proposal docs stay archived.

## Open Questions

None — the change is fully implemented and the affected specs (`cv-editor-ui`, `responsive-mobile-ui`, `visual-design-system`) cover the relevant behavior.
