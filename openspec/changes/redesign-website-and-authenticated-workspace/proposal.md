# Proposal: Redesign Resubuild website and authenticated workspace

## Why

Resubuild already supports importing CVs, editing structured JSON Resume data, preparing applications, generating tailored CVs, writing cover letters, and exporting PDFs. The current authenticated UI is functional, but it still reads as a form-heavy internal tool rather than a polished application workspace. The public website also needs a stronger visual identity, including a custom logo and consistent purple/teal brand system.

This change proposes a full design and workflow refresh so the product communicates a coherent narrative:

```text
CV → Job posting → Match analysis → Tailored CV → Cover letter → Export
```

The redesign is based on the attached authenticated redesign brief and the updated brand direction using:

- Primary purple: `#6d49f4`
- Secondary teal: `#00978a`
- White/light surfaces, muted borders, restrained shadows, rounded cards, and ATS-friendly visual restraint.

## What Changes

### Public website and brand

- Introduce a refreshed Resubuild logo system:
  - full wordmark + document/rebuild icon;
  - compact app icon / favicon variant;
  - logo usage in marketing header, authenticated shell, dashboard sidebar, footer, and PDF-adjacent UI where appropriate.
- Update marketing page visual design to use the two-color brand palette (`#6d49f4`, `#00978a`) across CTAs, icons, pills, highlights, gradients, and focus states.
- Reframe the homepage around the core promise: import a PDF CV, get a polished structured CV quickly, tailor it for jobs, and export cleanly.
- Add or refresh homepage sections:
  - Header / nav with logo and primary CTA.
  - Hero with product mockup.
  - Feature cards: AI PDF Import, Clean Editor, Job Tailoring, One-Click Export.
  - How it works: Import → Review/Edit → Tailor/Export.
  - Benefits row: No watermarks, JSON Resume, private data, ATS-friendly export.
  - Authenticated workspace preview.
  - Final CTA and footer.

### Authenticated shell and dashboard

- Add a real authenticated dashboard landing page instead of forcing the user immediately into `My CVs` or `Applications`.
- Add top-level authenticated navigation: `Dashboard`, `My CVs`, `Applications`, `Templates`, `Settings`.
- Keep one primary action visible per context:
  - `Import CV` in CV-heavy contexts;
  - `Prepare application` in application-heavy contexts.
- Add dashboard cards for CV count, application count, last export, average match score, recent applications, recent CVs, and AI recommendations.

### Applications list

- Replace flat rows with richer application cards/table rows showing role, company, status, update time, base CV, match score, generated outputs, and primary actions.
- Hide destructive actions behind a `More` menu.
- Add search, status filter, and sort controls.
- Add improved empty states.

### Application workspace

- Replace the current three-tab workspace with a structured application command center:
  - `Job details`
  - `Match analysis`
  - `Tailored CV`
  - `Cover letter`
  - `Exports`
- Rename `Update` to `Regenerate`.
- Rename `Job summary` to `Job details`.
- Provide explicit match analysis with strong evidence, missing/weak evidence, and recommended edits.
- Show tailoring score, changes applied, and keywords reinforced on the Tailored CV tab.
- Add `Evidence used` metadata to the cover-letter experience.
- Add an Exports tab for tailored CV PDF, cover letter PDF, JSON Resume, copy actions, and latest export metadata.

### Prepare application flow

- Replace the current single-form layout with a 4-step flow:
  1. Job source
  2. Base CV
  3. Tailoring instructions
  4. Review
- Use source cards instead of plain tabs for URL, pasted text, and PDF/screenshot upload.
- Rename base CV copy:
  - `Let AI pick best match` → `Let Resubuild choose the best CV`
  - `Choose CV` → `Use a specific CV`
- Replace the rich-text optional-instruction editor with a focused textarea plus quick instruction chips.
- Add a final review step before generation.

### CV editor and export preview

- Reorganize the CV editor into three modes:
  - `Edit`
  - `Improve with AI`
  - `Preview / Export`
- Replace ambiguous `Promote` wording with `Improve with AI` for AI improvement workflows.
- Keep JSON Resume structured editing in `Edit`.
- Move AI suggestions to `Improve with AI`.
- Consolidate print/PDF/JSON actions under `Preview / Export`.
- Improve preview layout controls:
  - collapsed layout settings by default;
  - template thumbnails instead of only a dropdown;
  - `Layout settings` instead of `Hide layout`;
  - optional sections such as References, Interests, Awards, and Publications disabled by default unless explicitly enabled.

## Capabilities

### Modified capabilities

- `landing-page`: update brand, logo, homepage visual structure, public CTAs, benefits, product mockups, and dashboard preview.
- `web-application`: add authenticated dashboard shell, dashboard landing page, navigation model, application list redesign, and workspace IA.
- `job-application-preparation`: update prepare flow, application workspace, match analysis, cover-letter evidence, export metadata, statuses, and application card model.
- `cv-editor-ui`: reorganize editor modes, rename ambiguous actions, add AI improvement surface, and refine preview/export controls.
- `cv-resume-export`: update preview/export UX, template selector, default section visibility, export grouping, and ATS-friendly indicators.
- `visual-design-system`: standardize brand tokens, logo usage, button hierarchy, cards, badges, empty states, and focus states using `#6d49f4` and `#00978a`.

## Impact

- **Frontend routes/components:** marketing pages, authenticated dashboard layout, CV list/editor, application list, application workspace, prepare application flow, preview/export page, shared shell/navigation, logo components.
- **Data model/API:** may require persisted fields for job details, match analysis, evidence used, tailoring score, tailoring summary, output availability, status, and export metadata.
- **AI workflows:** application generation should return structured analysis payloads in addition to tailored CV and cover-letter text.
- **Design system:** update global CSS tokens, semantic color usage, iconography, focus states, cards, empty states, and buttons.
- **E2E/UI tests:** add tests for dashboard, prepare stepper, application workspace tabs, match analysis, cover-letter evidence, exports, CV editor modes, and public website brand regression.

## Non-Goals

- Replacing the underlying JSON Resume data model.
- Introducing heavy visual effects that degrade ATS-friendly positioning.
- Changing authentication provider or account security model.
- Building a full CRM or external job-board scraper beyond the existing job source ingestion model.
- Automatically applying to jobs.
