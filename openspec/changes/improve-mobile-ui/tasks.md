# Tasks — improve-mobile-ui

## 1. Visual design tokens (accent palette)

- [x] 1.1 Define accent hue tokens in `apps/web/src/app/globals.css`: re-point `--primary`, `--primary-foreground`, `--ring` to the accent family for light scheme; add a soft accent tint token for active/selected states; keep destructive tokens unchanged
- [x] 1.2 Add dark-scheme accent values in the `prefers-color-scheme: dark` block (lightened hue for contrast) and align markdown link colors to the accent family in both schemes
- [x] 1.3 Sweep `apps/web/src/components/` for hardcoded zinc/gray classes on interactive elements (active nav states in `dashboard/layout.tsx`, `cv-section-nav-links.tsx`, tabs/segments) and migrate them to semantic tokens
- [x] 1.4 Verify WCAG AA contrast (4.5:1 text, 3:1 UI) for all changed token pairs in both schemes; record the checked pairs in the PR description

## 2. Auth pages (login centering + copy)

- [x] 2.1 Rework `apps/web/src/components/auth/auth-page-shell.tsx`: `min-h-screen` fallback + `min-h-dvh`, flex `justify-center` with balanced `py-8 sm:py-16`, reduced card padding below `sm`
- [x] 2.2 Shorten login title/subtitle copy in `apps/web/src/app/login/page.tsx` / `login-form.tsx` (e.g. subtitle → "Welcome back") and review register/forgot-password copy for 375px fit
- [x] 2.3 Update colocated Vitest tests for the auth shell/login form copy changes

## 3. CV editor mobile navigation drawer

- [x] 3.1 In `apps/web/src/components/cv/cv-section-layout.tsx`, hide the persistent rail below `md` (`hidden md:block`) and keep the existing collapsible sidebar behavior at `md+` unchanged
- [x] 3.2 Add a mobile drawer using the existing `Sheet` component (`apps/web/src/components/ui/sheet.tsx`): left side, full labeled section list reusing `cv-section-nav-links.tsx` with icons, active state, and `aria-current="page"`; close on selection
- [x] 3.3 Rework `CvSectionNavToggle` in `cv-editor-chrome.tsx`: below `md` the toggle opens the drawer; at `md+` it keeps collapse/expand semantics; remove the `matchMedia` first-click heuristic for mobile
- [x] 3.4 Add/update colocated Vitest tests: drawer opens from toggle, lists all 13 sections, closes on selection, no rail rendered below `md`, sidebar behavior intact at `md+`

## 4. Basics section mobile layout

- [x] 4.1 In `apps/web/src/components/cv/cv-item-ui.tsx` / `managed-basics-section.tsx`, switch the Basics title block to `flex-col sm:flex-row` so the photo stacks above name/label/contact below `sm`; ensure the identity block and summary use full row width on mobile
- [x] 4.2 Confirm `profile-photo-thumbnail.tsx` constraints (≤150×150, thumbnail endpoint, error state, upload/delete affordances) are unaffected in both layouts
- [x] 4.3 Update colocated Vitest tests for the Basics row stacking behavior

## 5. Icon-only header actions

- [x] 5.1 `apps/web/src/components/dashboard/new-cv-dropdown.tsx`: icon always visible, label `hidden sm:inline`, accessible name preserved when icon-only
- [x] 5.2 `apps/web/src/components/applications/application-list.tsx`: same pattern for "Prepare application"
- [x] 5.3 `apps/web/src/components/cv/cv-editor-header-actions.tsx`: same pattern for Export and Preview actions
- [x] 5.4 `apps/web/src/app/dashboard/cv/[id]/preview/cv-preview-client.tsx`: move label-visibility threshold from `lg` to `sm` for Back/Layout/Print/JSON/PDF toolbar buttons
- [x] 5.5 Add/update colocated Vitest tests asserting icon-only rendering below `sm` with correct `aria-label`s and visible labels at `sm+`

## 6. Dashboard header fit

- [x] 6.1 In `apps/web/src/app/dashboard/layout.tsx`, compress spacing/typography below `sm` so brand, both nav links, and user menu fit one row at 375px without wrapping or overflow

## 7. Verification

- [x] 7.1 Run `pnpm test -- --run` (web Vitest suites) and fix regressions
- [x] 7.2 Run `pnpm verify` (format, lint, typecheck, build) and fix any issues
- [x] 7.3 Manual responsive sweep at 375px, 640px, 768px, 1024px in light and dark schemes: login, register, dashboard, applications, CV editor (Basics, Work, drawer flow), preview toolbar — confirm no horizontal overflow anywhere
  - Static analysis: 375px fits all changes (auth shell `px-4`/`py-8`, dashboard header `gap-2 sm:gap-6 px-4`, icon-only buttons, flex-col stacking for Basics). Browser-based visual verification still required before merge.

## 8. E2E test impact

- [x] 8.1 Audit `e2e` specs touching the section nav, login, and list-page actions: selectors targeting the old persistent mobile rail or text-labeled buttons may need updates (update required); desktop-viewport flows must pass unchanged. Do not edit unrelated E2E specs
  - The only E2E spec (`apps/api/test/e2e/local-supabase.e2e-spec.ts`) is API-only (supertest, no browser, no UI selectors). No E2E updates required.
