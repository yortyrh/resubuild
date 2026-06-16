# Tasks: UI-only Resubuild website and authenticated workspace redesign

## 1. Brand and design system

- [ ] 1.1 Add brand tokens for `#6d49f4` and `#00978a`.
- [ ] 1.2 Add reusable logo components: full wordmark, compact mark, and favicon/app icon.
- [ ] 1.3 Add or refresh line icons matching the reference design: import, edit, sparkle, export, shield, lock, check, table/list, CV card, and application workspace.
- [ ] 1.4 Update shared buttons, badges, cards, empty states, focus rings, tabs, and selected states to use the purple/teal palette.
- [ ] 1.5 Audit existing accent colors and avoid competing dominant accents.

## 2. Public website redesign

- [ ] 2.1 Refresh marketing header with new logo, navigation, login, and primary CTA.
- [ ] 2.2 Redesign hero section following the attached reference design.
- [ ] 2.3 Add or refresh hero product mockup showing structured CV editing and PDF export.
- [ ] 2.4 Update feature cards for AI PDF Import, Clean Editor, Job Tailoring, and One-Click Export.
- [ ] 2.5 Update How It Works section to Import CV → Review & Edit → Tailor & Export.
- [ ] 2.6 Add benefits row: No watermarks, JSON Resume, private data, ATS-friendly exports.
- [ ] 2.7 Add authenticated workspace preview showing existing concepts only: My CVs thumbnails, recent applications, statuses when available, and existing CTAs.
- [ ] 2.8 Refresh final CTA and footer with new logo and palette.
- [ ] 2.9 Preserve existing SEO requirements, FAQ content, metadata, sitemap, robots, and JSON-LD behavior.

## 3. Authenticated shell and dashboard

- [ ] 3.1 Add a lightweight authenticated dashboard landing page.
- [ ] 3.2 Ensure `My CVs` navigation lands on the CV list, not the new dashboard.
- [ ] 3.3 If `/dashboard` currently serves the CV list, move CV-list links to the repo’s CV-list route before assigning `/dashboard` to the dashboard.
- [ ] 3.4 Update authenticated navigation styling with the refreshed logo and purple/teal selected states.
- [ ] 3.5 Add dashboard recent CVs and recent applications using existing data.
- [ ] 3.6 Add simple dashboard counts only when derivable from existing loaded data.

## 4. My CVs list

- [ ] 4.1 Redesign My CVs as a grid/list of CV thumbnail cards.
- [ ] 4.2 Display existing CV data: name/title, headline/label when available, last updated when available, and existing actions.
- [ ] 4.3 Add non-blocking thumbnail rendering or placeholder cards when thumbnails are unavailable.
- [ ] 4.4 Move secondary or destructive actions into an overflow menu or existing confirmation flow.
- [ ] 4.5 Add polished empty state with existing Import/Create CV actions.

## 5. Applications list

- [ ] 5.1 Redesign Applications as a table or card/table hybrid.
- [ ] 5.2 Display existing application data only: role, company, status if available, base CV if available, dates if available, and existing outputs/actions if available.
- [ ] 5.3 Move destructive actions behind a More menu and keep existing confirmation behavior.
- [ ] 5.4 Add improved empty state with existing Prepare application CTA.

## 6. Prepare application UI polish

- [ ] 6.1 Improve the visual layout of the prepare application page without changing submitted data.
- [ ] 6.2 Restyle existing job-source controls as cards where source types already exist.
- [ ] 6.3 Improve base CV selector presentation using existing CV data.
- [ ] 6.4 Improve optional-instruction control styling without adding required fields.
- [ ] 6.5 Optionally use a stepper-like visual layout only if it preserves the same inputs and submit behavior.
- [ ] 6.6 Preserve existing job ingestion and generation endpoints.

## 7. Application workspace UI polish

- [ ] 7.1 Apply the new brand system, spacing, cards, buttons, and tab styling to the existing workspace.
- [ ] 7.2 Keep the current functional tabs/sections and existing outputs.
- [ ] 7.3 Rename ambiguous labels only where behavior is unchanged.
- [ ] 7.4 Improve empty/loading states for existing workspace content.
- [ ] 7.5 Do not add Evidence used, compare mode, generation summary, match analysis, recommended edits, or new export-history surfaces.

## 8. CV editor and preview/export UI polish

- [ ] 8.1 Polish existing CV editor layout, section navigation, cards, selected states, and buttons.
- [ ] 8.2 Preserve existing structured JSON Resume editing behavior.
- [ ] 8.3 Do not add a new Improve with AI mode or new AI action cards in this phase.
- [ ] 8.4 Improve preview/export toolbar styling while keeping PDF/print/JSON behavior unchanged.
- [ ] 8.5 Add visual template thumbnails or preview cards where safe; otherwise keep and restyle the existing selector.
- [ ] 8.6 Rename confusing preview controls only where behavior is unchanged.

## 9. Verification

- [ ] 9.1 Run OpenSpec validation for this change.
- [ ] 9.2 Run type checks and linting for affected packages.
- [ ] 9.3 Run unit/component tests for changed UI components.
- [ ] 9.4 Run relevant E2E paths: CV import, CV list, CV edit, PDF export, prepare application, application workspace, cover letter, and JSON Resume export.
- [ ] 9.5 Verify mobile/responsive behavior for homepage, dashboard, CV list, applications table, prepare page, workspace, and preview/export.
- [ ] 9.6 Verify that no backend schema, AI prompt/schema, or generation response contract changes were introduced.