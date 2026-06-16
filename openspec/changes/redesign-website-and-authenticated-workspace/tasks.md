# Tasks: Resubuild website and authenticated workspace redesign

## 1. Brand and design system

- [ ] 1.1 Add brand tokens for `#6d49f4` and `#00978a` to the web design system / global CSS.
- [ ] 1.2 Add reusable logo components: full wordmark, compact mark, and favicon/app icon usage.
- [ ] 1.3 Update shared button, badge, card, empty-state, focus-ring, and selected-state styles to use the new purple/teal palette.
- [ ] 1.4 Audit existing accent colors and remove competing dominant accent colors where they conflict with the new brand palette.
- [ ] 1.5 Add visual regression coverage or component-level tests for the new shell/logo states where practical.

## 2. Public website redesign

- [ ] 2.1 Refresh marketing header with new logo, navigation, and primary CTA.
- [ ] 2.2 Redesign hero section around PDF import, polished CV, job tailoring, and export promise.
- [ ] 2.3 Add/refresh hero product mockup showing structured CV editing and PDF export.
- [ ] 2.4 Update feature cards for AI PDF Import, Clean Editor, Job Tailoring, and One-Click Export.
- [ ] 2.5 Update How It Works section to Import CV → Review & Edit → Tailor & Export.
- [ ] 2.6 Add benefits/trust row: No watermarks, JSON Resume, private data, ATS-friendly exports.
- [ ] 2.7 Add authenticated workspace preview section showing My CVs, recent applications, statuses, and CTAs.
- [ ] 2.8 Refresh final CTA and footer with new logo and palette.
- [ ] 2.9 Preserve existing SEO requirements, FAQ content, metadata, sitemap, robots, and JSON-LD behavior.

## 3. Authenticated shell and dashboard

- [ ] 3.1 Add authenticated dashboard landing page for signed-in users.
- [ ] 3.2 Update authenticated navigation to Dashboard, My CVs, Applications, Templates, Settings.
- [ ] 3.3 Add context-aware primary action in shell/header.
- [ ] 3.4 Add dashboard stat cards: CVs saved, Applications ready, Last export, Average match score.
- [ ] 3.5 Add recent applications and recent CVs dashboard sections.
- [ ] 3.6 Add AI recommendations panel with defensive empty/loading states.
- [ ] 3.7 Ensure dashboard uses existing authenticated provider boundaries and keeps noindex metadata.

## 4. Applications list

- [ ] 4.1 Replace flat application rows with richer card/table presentation.
- [ ] 4.2 Display role, company, status, last updated time, base CV, match score, and generated outputs.
- [ ] 4.3 Add search, status filter, and date sorting controls.
- [ ] 4.4 Hide destructive delete action behind a More menu and keep delete confirmation behavior.
- [ ] 4.5 Add improved empty state with Prepare application CTA.
- [ ] 4.6 Add tests for list rendering, filters, and delete-menu behavior.

## 5. Prepare application stepper

- [ ] 5.1 Convert `/dashboard/applications/new` to a four-step flow.
- [ ] 5.2 Step 1: source cards for URL, pasted text, and PDF/screenshot upload.
- [ ] 5.3 Step 2: base CV selector with renamed labels and selected CV summary.
- [ ] 5.4 Step 3: simple instruction textarea with quick instruction chips.
- [ ] 5.5 Step 4: review step summarizing source, base CV, instructions, and outputs before generation.
- [ ] 5.6 Preserve existing job ingestion and generation endpoints during the UI refactor.
- [ ] 5.7 Add tests for step navigation, validation, and generation submission payloads.

## 6. Application workspace

- [ ] 6.1 Replace workspace tabs with Job details, Match analysis, Tailored CV, Cover letter, Exports.
- [ ] 6.2 Rename Job summary → Job details and Update → Regenerate.
- [ ] 6.3 Add Job details panel showing extracted title, company, source, location, seniority, responsibilities, requirements, and keywords.
- [ ] 6.4 Add Match analysis panel with score, strong evidence, missing/weak evidence, recommended edits, and keyword coverage.
- [ ] 6.5 Add Tailored CV panel with tailoring score, changes applied, reinforced keywords, preview, compare action, and export action.
- [ ] 6.6 Add Cover letter panel with editor, tone/length/focus metadata, regenerate action, and Evidence used panel.
- [ ] 6.7 Add Exports panel with tailored CV PDF, cover letter PDF, JSON Resume, copy, print, and latest export metadata.
- [ ] 6.8 Add optional structured analysis fields to application/generation payloads and render defensively for older records.
- [ ] 6.9 Add tests for tab rendering, persistence if applicable, and fallback states for missing analysis metadata.

## 7. CV editor and preview/export

- [ ] 7.1 Reorganize CV editor into Edit, Improve with AI, Preview / Export.
- [ ] 7.2 Move structured section editing under Edit.
- [ ] 7.3 Replace ambiguous Promote wording with Improve with AI for AI improvement workflows.
- [ ] 7.4 Add Improve with AI action cards for summary, quantification, ATS, leadership, technical depth, and one-page shortening.
- [ ] 7.5 Consolidate template, layout, print, PDF, and JSON actions under Preview / Export.
- [ ] 7.6 Add visual template thumbnails to preview/export.
- [ ] 7.7 Rename Hide layout → Layout settings.
- [ ] 7.8 Default optional sections off: References, Interests, Awards, Publications unless explicitly enabled.
- [ ] 7.9 Add tests for mode switching, export actions, default section visibility, and template selection.

## 8. Data and AI contract

- [ ] 8.1 Define additive application analysis/output metadata types.
- [ ] 8.2 Update AI generation prompts/schemas to produce job details, match analysis, evidence used, changes applied, and keyword coverage.
- [ ] 8.3 Persist new metadata without breaking existing application records.
- [ ] 8.4 Add backend/API validation for optional analysis/output metadata where required.
- [ ] 8.5 Add migration or defensive defaults if database schema changes are required.

## 9. Verification

- [ ] 9.1 Run OpenSpec validation for this change.
- [ ] 9.2 Run type checks and linting for affected packages.
- [ ] 9.3 Run unit/component tests for changed UI components.
- [ ] 9.4 Run relevant E2E paths: CV import, CV edit, PDF export, prepare application, application workspace, cover letter, JSON Resume export.
- [ ] 9.5 Verify mobile/responsive behavior for homepage, dashboard, application list, prepare stepper, workspace, and preview/export.
