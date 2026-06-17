## Why

> This change retroactively documents work already implemented in the working tree.

The CV editor's persistent header chrome (breadcrumb + Export/Preview buttons + the mobile section-nav drawer) crowded narrow viewports between the `md` and `lg` breakpoints: the breadcrumb rendered a redundant `<h1>` page title, the section-nav drawer showed its native close button and a full Sheet header, the CV title segment swapped between short/full forms at the `sm` threshold (still cramped at `md`), and the Export/Preview labels stayed visible from `sm` up — eating horizontal space at `md`/`lg` and forcing the header row to wrap. We want a denser header layout that keeps every control reachable without a page title, hides drawer chrome that's redundant with the toggle button, suppresses the scrollbar chrome inside the narrow drawer, and shifts the visible-label thresholds for the CV title and the header actions so the row stays intact on common laptop widths.

## What Changes

- Add a `.scrollbar-hidden` utility in `apps/web/src/app/globals.css` that hides the scrollbar visually while keeping the element scrollable, and apply it to the mobile section-nav drawer.
- Stop rendering a separate `<h1 data-testid="cv-page-title">` beneath the trail in `CvEditorBreadcrumb` and `CvApplicationEditorBreadcrumb`. The active section name already lives inside the breadcrumb's last `BreadcrumbPage`, so the redundant heading is removed (along with the related tests).
- Bump the short/full CV title breakpoint in `CvTitleDisplay` from `sm` to `md` so the full derived title appears from `md` up instead of `sm`.
- Bump the Export/Preview visible-label breakpoint in `CvEditorHeaderActions` from `sm` to `lg` so the labels stay hidden at `md`/`lg` and only reappear on `lg+` viewports.
- Strip the `SheetHeader`/`SheetDescription` chrome from the mobile section-nav drawer in `CvSectionLayout`: hide the Sheet close button (`[&>button]:hidden`), promote the title to an `sr-only` `SheetTitle`, and remove padding/header chrome that ate drawer space. Apply the scrollbar-hidden utility to the inner scrollable region.

## Capabilities

### New Capabilities

None. This change only modifies existing behavior and does not introduce new specs.

### Modified Capabilities

- `cv-editor-ui`: Removes the redundant page-title H1 from the editor breadcrumb; bumps the short/full CV title responsive threshold from `sm` to `md`. Adjusts the existing "CV editor SHALL expose breadcrumb context above section content" requirement.
- `responsive-mobile-ui`: Shifts the Export/Preview visible-label breakpoint in the CV editor header actions from `sm` to `lg` so the row stays dense at `md`/`lg`. Updates the existing "Primary header actions SHALL collapse to icon-only buttons below the sm breakpoint" requirement and the corresponding "Icon-only toolbar on narrow viewports" / "Labels return on larger screens" scenarios.
- `visual-design-system`: Adds the `.scrollbar-hidden` utility token family to `apps/web/src/app/globals.css` and registers its usage for the CV section-nav drawer.

## Impact

- Code: `apps/web/src/app/globals.css`, `apps/web/src/app/dashboard/cv/[id]/preview/cv-preview-client.tsx` (drawer scrollbar-hidden), `apps/web/src/components/cv/cv-application-editor-breadcrumb.{tsx,test.tsx}`, `apps/web/src/components/cv/cv-editor-breadcrumb.{tsx,test.tsx}`, `apps/web/src/components/cv/cv-editor-header-actions.{tsx,test.tsx}`, `apps/web/src/components/cv/cv-section-layout.tsx`, `apps/web/src/app/dashboard/cv/[id]/preview/cv-preview-client.test.tsx`.
- Tests: Removes the `cv-page-title` assertions from breadcrumb tests; updates the `CvEditorHeaderActions` test to assert `hidden lg:inline` instead of `hidden sm:inline`.
- APIs: none.
- Dependencies: none.
