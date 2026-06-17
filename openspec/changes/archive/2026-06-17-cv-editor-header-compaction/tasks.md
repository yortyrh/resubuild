# Tasks: cv-editor-header-compaction

> All tasks are complete; this document retroactively records the implementation that already lives in the working tree.

## 1. Add `.scrollbar-hidden` utility

- [x] 1.1 Add `.scrollbar-hidden` CSS rule to `apps/web/src/app/globals.css` with cross-browser scrollbar suppression (WebKit, Firefox, legacy Edge).
- [x] 1.2 Apply `scrollbar-hidden` to the mobile section-nav drawer in `apps/web/src/components/cv/cv-section-layout.tsx` and the layout-panel drawer in `apps/web/src/app/dashboard/cv/[id]/preview/cv-preview-client.tsx`.

## 2. Strip the redundant page title from the editor breadcrumb

- [x] 2.1 Remove the trailing `<h1 data-testid="cv-page-title">` and surrounding wrapper `<div className="space-y-1">` from `apps/web/src/components/cv/cv-editor-breadcrumb.tsx`.
- [x] 2.2 Remove the trailing `<h1 data-testid="cv-page-title">` and surrounding wrapper `<div className="space-y-1">` from `apps/web/src/components/cv/cv-application-editor-breadcrumb.tsx`.
- [x] 2.3 Update `apps/web/src/components/cv/cv-editor-breadcrumb.test.tsx`: replace the "shows the trail-end as a page title" assertion with "does not render a separate page title element"; update the preview-route assertion; drop the now-unnecessary assertion in the basics scenario.
- [x] 2.4 Update `apps/web/src/components/cv/cv-application-editor-breadcrumb.test.tsx`: replace the "renders the trail-end as a page title" assertion with "does not render a separate page title element"; update the preview-route assertion; drop the now-unnecessary assertion in the basics scenario.
- [x] 2.5 Update `apps/web/src/app/dashboard/cv/[id]/preview/cv-preview-client.test.tsx`: drop the assertion that the breadcrumb rendering shows a `cv-page-title` element with text "Preview".

## 3. Bump the short/full CV title breakpoint to `md`

- [x] 3.1 In `apps/web/src/components/cv/cv-editor-breadcrumb.tsx`, change `CvTitleDisplay` short/full classes from `sm:hidden`/`hidden sm:inline` to `md:hidden`/`hidden md:inline`.
- [x] 3.2 Update `apps/web/src/components/cv/cv-editor-breadcrumb.test.tsx` to assert `md:inline` and `md:hidden` instead of `sm:inline` and `sm:hidden`.

## 4. Bump Export/Preview visible labels to `lg`

- [x] 4.1 In `apps/web/src/components/cv/cv-editor-header-actions.tsx`, change `sm:mr-1.5` → `lg:mr-1.5` and `hidden sm:inline` → `hidden lg:inline` on both the Export trigger and the Preview link.
- [x] 4.2 Update `apps/web/src/components/cv/cv-editor-header-actions.test.tsx` to assert the hidden labels use `hidden lg:inline` and rename the test scenario to "hides the visible Export and Preview labels below lg".

## 5. Strip the mobile drawer Sheet chrome

- [x] 5.1 In `apps/web/src/components/cv/cv-section-layout.tsx`, remove `SheetHeader` and `SheetDescription` imports and usage; replace with an `sr-only` `SheetTitle`.
- [x] 5.2 Hide the Sheet's native close button via `[&>button]:hidden` on the drawer's `SheetContent` and reduce padding to `px-0 py-2`.

## E2E test impact

**None — UI-only change.**

This change only modifies CV editor client-side chrome (Tailwind classes, removed DOM nodes, CSS utility, and Vitest assertions). No REST contracts, Supabase schema, auth flows, or media API behavior change.

- **Must pass unchanged** (regression guards — do not edit):
  - `auth (local Supabase)` — capability `authentication`
  - `CV REST (local Supabase)` — capabilities `cv-rest-api`, `resume-schema-validation`
  - `media service (local Supabase)` — capability `resume-media-uploads`
  - `CV export (local Supabase)` — capabilities `cv-export`, `cv-json-export`
  - `CV template presentation` — capability `cv-template-presentation`
  - `CV lifecycle (local Supabase)` — capability `cv-rest-api`
  - `CV sections coverage (local Supabase)` — capability `cv-items-api`
  - `AI agent catalog (local Supabase)` — capability `ai-agent-settings`
  - `import LLM config (local Supabase)` — capability `import-llm-config`
  - `import URL validation (local Supabase)` — capability `cv-import-url`

- **Update required**: none.
- **Add**: none.
