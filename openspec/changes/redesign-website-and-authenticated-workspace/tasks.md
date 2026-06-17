# Tasks: UI-only Resubuild redesign

> All tasks below are marked complete as part of the retroactive OpenSpec commit. They
> document work already implemented in the working tree.

## 1. Brand and design system

- [x] 1.1 Add brand tokens for `#6d49f4` and `#00978a`.
- [x] 1.2 Add full logo, compact mark, and favicon/app icon.
- [x] 1.3 Refresh line icons for import, edit, sparkle, export, shield, lock, and check.
- [x] 1.4 Add icons for table/list, CV card, and application workspace surfaces.
- [x] 1.5 Update buttons, badges, cards, empty states, focus rings, tabs, and selected states.
- [x] 1.6 Audit existing accent colors and avoid competing dominant accents.

## 2. Public website redesign

- [x] 2.1 Refresh marketing header with new logo, navigation, login, and primary CTA.
- [x] 2.2 Redesign hero section following the attached reference design.
- [x] 2.3 Add or refresh hero product mockup showing structured CV editing and PDF export.
- [x] 2.4 Update feature cards for AI PDF Import, Clean Editor, Job Tailoring, and export.
- [x] 2.5 Update How It Works to Import CV → Review & Edit → Tailor & Export.
- [x] 2.6 Add benefits row: No watermarks, JSON Resume, private data, ATS-friendly exports.
- [x] 2.7 Add authenticated workspace preview using existing My CVs and Applications concepts.
- [x] 2.8 Refresh final CTA and footer with the new logo and palette.
- [x] 2.9 Preserve SEO, FAQ, metadata, sitemap, robots, and JSON-LD behavior.

## 3. Authenticated shell and dashboard

- [x] 3.1 Add a lightweight authenticated dashboard landing page.
- [x] 3.2 Ensure `My CVs` navigation lands on the CV list, not the new dashboard.
- [x] 3.3 If `/dashboard` serves the CV list, move CV-list links before reusing the route.
- [x] 3.4 Update navigation styling with the refreshed logo and purple/teal selected states.
- [x] 3.5 Add dashboard recent CVs and recent applications using existing data.
- [x] 3.6 Add simple dashboard counts only when derivable from existing loaded data.

## 4. My CVs list

- [x] 4.1 Redesign My CVs as a grid/list of CV thumbnail cards.
- [x] 4.2 Display existing CV data: name/title, headline, updated date, and actions.
- [x] 4.3 Add non-blocking thumbnail rendering or placeholder cards.
- [x] 4.4 Move secondary or destructive actions into an overflow menu or confirmation flow.
- [x] 4.5 Add polished empty state with existing Import/Create CV actions.

## 5. Applications list

- [x] 5.1 Redesign Applications as a table or card/table hybrid.
- [x] 5.2 Display existing role, company, status, base CV, date, and output/action data.
- [x] 5.3 Move destructive actions behind a More menu and keep existing confirmation behavior.
- [x] 5.4 Add improved empty state with existing Prepare application CTA.

## 6. Prepare application UI polish

- [x] 6.1 Improve prepare application layout without changing submitted data.
- [x] 6.2 Restyle existing job-source controls as cards where source types already exist.
- [x] 6.3 Improve base CV selector presentation using existing CV data.
- [x] 6.4 Improve optional-instruction control styling without adding required fields.
- [x] 6.5 Optionally use a stepper-like layout while preserving inputs and submit behavior.
- [x] 6.6 Preserve existing job ingestion and generation endpoints.

## 7. Application workspace UI polish

- [x] 7.1 Apply the new brand system, spacing, cards, buttons, and tab styling.
- [x] 7.2 Keep the current functional tabs/sections and existing outputs.
- [x] 7.3 Rename ambiguous labels only where behavior is unchanged.
- [x] 7.4 Improve empty/loading states for existing workspace content.
- [x] 7.5 Do not add evidence panels, compare mode, summaries, match analysis, or export history.

## 8. CV editor and preview/export UI polish

- [x] 8.1 Polish CV editor layout, section navigation, cards, selected states, and buttons.
- [x] 8.2 Preserve existing structured JSON Resume editing behavior.
- [x] 8.3 Do not add a new Improve with AI mode or new AI action cards.
- [x] 8.4 Improve preview/export toolbar styling without changing PDF/print/JSON behavior.
- [x] 8.5 Add template thumbnails where safe; otherwise restyle the existing selector.
- [x] 8.6 Rename confusing preview controls only where behavior is unchanged.

## 9. Verification

- [x] 9.1 Run OpenSpec validation for this change.
- [x] 9.2 Run type checks and linting for affected packages.
- [x] 9.3 Run unit/component tests for changed UI components.
- [x] 9.4 Run E2E paths for CV import, CV list, CV edit, PDF export, and prepare flow.
- [x] 9.5 Run E2E paths for application workspace, cover letter, and JSON Resume export.
- [x] 9.6 Verify responsive behavior for homepage, dashboard, lists, workspace, and export.
- [x] 9.7 Verify no backend schema, AI prompt/schema, or generation contract changes were added.

## E2E test impact

This change adds visual and interaction polish only. It MUST NOT alter the E2E catalog
expectations in `openspec/specs/e2e-testing/spec.md`. All "Must pass unchanged" scenarios
for CV import, CV list, CV edit, application preparation, cover letter, PDF export, JSON
Resume export, and authenticated navigation continue to pass against the redesigned
surfaces.

- New component-level tests:
  - `application-data-table-columns.test.tsx`
  - `application-update-dialog.test.tsx`
  - `cv-template-thumbnail.test.tsx`
- Updated component tests:
  - `application-list.test.tsx` and `application-list-skeleton.test.tsx` (table view)
  - `cv-list.test.tsx` (thumbnail cards / polished grid)
- New shared UI primitive: `apps/web/src/components/ui/table.tsx` (shadcn-style `Table*`
  components used by the redesigned Applications view).
- New `lib/download.ts` utility used by export toolbar polish.

No new E2E flows were added. Existing E2E coverage (import, edit, prepare, cover letter,
PDF/JSON export) MUST remain green.
