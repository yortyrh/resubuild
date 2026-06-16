# Design: Resubuild website and authenticated workspace refresh

## Context

The existing product has the necessary building blocks: marketing pages, CV import/edit/export, application preparation, tailored CV, and cover-letter workflows. The redesign changes the experience architecture and presentation so those pieces feel like one premium SaaS workflow rather than separate screens.

The attached brief calls for a calmer, more productized authenticated experience with richer application cards, an authenticated dashboard, a five-tab application workspace, a guided prepare flow, clearer CV editor modes, and stronger preview/export controls. This proposal also incorporates the updated two-color brand palette: purple `#6d49f4` and teal `#00978a`.

## Design Principles

1. **Command center, not form generator**
   - The authenticated app should help users understand state, evidence, gaps, and next actions.
   - The application workspace is the core product surface.

2. **One primary action per screen**
   - Avoid competing CTAs.
   - Destructive actions are secondary and hidden behind menus.

3. **Trust through explainability**
   - AI output should show evidence, match rationale, and changes applied.
   - Cover letters should expose evidence used.

4. **ATS-friendly visual restraint**
   - The marketing site can be polished, but exports and preview controls should remain clean, scannable, and recruiter-oriented.

5. **Consistent brand system**
   - Use `#6d49f4` for primary actions, selected states, and key highlights.
   - Use `#00978a` for success, progress, secondary accents, and trust cues.
   - Avoid introducing additional dominant accent colors.

## Brand and Logo System

### Logo direction

Create a reusable `ResubuildLogo` system with:

- full horizontal lockup: icon + `Resubuild` wordmark;
- compact mark for favicon/app icon/sidebar collapsed state;
- monochrome/print-safe fallback if required.

The icon should combine:

- a document/CV sheet;
- a rebuild/progress arrow or upward motion;
- a subtle AI/spark accent.

The icon should not look like a generic file-upload icon only; it must communicate rebuilding/improving a CV.

### Color tokens

Recommended semantic tokens:

```css
--brand-primary: #6d49f4;
--brand-primary-hover: #5f3ee6;
--brand-primary-soft: color-mix(in srgb, #6d49f4 12%, white);

--brand-secondary: #00978a;
--brand-secondary-hover: #008075;
--brand-secondary-soft: color-mix(in srgb, #00978a 12%, white);

--background: #fbfbff;
--surface: #ffffff;
--surface-muted: #f7f7fb;
--border: #e7e7ef;
--text: #111827;
--text-muted: #6b7280;
```

## Public Website

### Information architecture

The public homepage should keep the SEO-oriented content already present, but the visual hierarchy should be refreshed:

1. Header
2. Hero
3. Product mockup
4. Benefits row
5. Features
6. How it works
7. Authenticated dashboard/workspace preview
8. JSON Resume / privacy / ATS trust callout
9. FAQ
10. Final CTA
11. Footer

### Hero

Primary message:

```text
Import your PDF CV.
Get a polished CV in seconds.
```

Supporting message:

```text
Resubuild turns your existing resume into a clean, structured, ATS-ready CV. Tailor it to any role, write a cover letter, and manage your applications — all in one place.
```

Primary CTA: `Import my PDF CV` or `Get started free`.
Secondary CTA: `Start from scratch` or `See how it works`.

### Product mockup

The hero mockup should show the real product promise:

- left structured section navigation;
- central CV preview/editor;
- top actions: `Preview`, `Export PDF`;
- subtle success state: `Saved`.

### Features

Feature cards:

- AI PDF Import
- Clean Editor
- Job Tailoring
- One-Click Export

Each card should use a small purple/teal icon container, title, and short description.

### Dashboard preview

Marketing should preview the authenticated application workspace so users understand that Resubuild is more than a simple template generator.

Preview content:

- My CVs cards;
- Recent applications;
- Status badges;
- Import PDF CV CTA;
- Application tracking table.

## Authenticated Shell

### Navigation

Recommended top-level routes:

```text
Dashboard
My CVs
Applications
Templates
Settings
```

The active route should use a soft purple or teal background, not only text color.

### Primary actions

- Dashboard: `Prepare application` and secondary `Import CV`.
- My CVs: `Import CV`.
- Applications: `Prepare application`.
- Application workspace: `Regenerate` and `Export PDF`.
- CV editor preview mode: `Export PDF`.

## Authenticated Dashboard

The dashboard should be the signed-in landing surface.

Sections:

- welcome header;
- stats cards:
  - CVs saved;
  - Applications ready;
  - Last export;
  - Average match score;
- recent applications;
- recent CVs;
- AI recommendations.

AI recommendation examples:

- Add measurable impact to recent role bullets.
- Tailor React CV for recent Software Engineer job.
- Add missing QA wording before export.

## Applications List

Replace plain rows with richer cards or table rows.

Each application item should show:

- role and company;
- status badge;
- last updated time;
- base CV name;
- match score if available;
- output availability: Tailored CV, Cover letter, PDF;
- primary action: `Open workspace`;
- secondary action: `Export PDF`;
- overflow menu for destructive actions.

Search/filter controls:

- text search;
- status filter;
- sort by updated/applied date;
- optional company/role filters.

## Application Workspace

### Tabs

The workspace should expose five tabs:

```text
Job details | Match analysis | Tailored CV | Cover letter | Exports
```

### Job details

Show extracted job information:

- title;
- company;
- source type and source URL/file name;
- location;
- contract type;
- seniority;
- responsibilities;
- requirements;
- keywords;
- raw source link or uploaded source metadata.

### Match analysis

Show a structured match report:

- overall match score;
- strong evidence;
- weak or missing evidence;
- recommended edits;
- keywords present/missing;
- possible risk flags.

### Tailored CV

Show:

- tailoring score;
- tailored CV preview;
- changes applied;
- reinforced keywords;
- actions:
  - `Edit tailored CV`;
  - `Compare with base CV`;
  - `Export PDF`.

### Cover letter

Use a two-column layout at desktop widths:

- editor on the left;
- `Evidence used` panel on the right.

Metadata controls:

- tone;
- length;
- focus areas;
- regenerate action.

### Exports

Group export actions:

- Tailored CV PDF;
- Cover letter PDF;
- JSON Resume;
- copy cover letter;
- print;
- latest export metadata.

Export history can be implemented as a later enhancement, but the UI should reserve a place for it.

## Prepare Application Stepper

Convert `/dashboard/applications/new` from a single form into a four-step flow:

1. Job source
2. Base CV
3. Tailoring instructions
4. Review

### Step 1: Job source

Use cards for:

- URL
- Paste text
- Upload PDF or screenshot

Each card should contain a short description.

### Step 2: Base CV

Options:

- `Let Resubuild choose the best CV`
- `Use a specific CV`

Show a compact CV summary when a CV is selected.

### Step 3: Tailoring instructions

Replace the full rich-text editor with:

- textarea;
- quick chips:
  - Emphasize React;
  - Emphasize AWS;
  - Keep it concise;
  - Target Canadian employers;
  - Focus on leadership.

### Step 4: Review

Show a read-only summary before generation:

- source;
- base CV;
- instructions;
- expected outputs.

## CV Editor

### Modes

Replace the current mental model with:

```text
Edit | Improve with AI | Preview / Export
```

### Edit

Keep structured JSON Resume editing and item-level persistence.

### Improve with AI

Suggested actions:

- Improve summary;
- Quantify bullet points;
- Make ATS-friendly;
- Strengthen leadership;
- Add technical depth;
- Shorten to one page.

### Preview / Export

Consolidate:

- template selector;
- layout controls;
- section visibility;
- header field toggles;
- print;
- PDF;
- JSON Resume.

## Preview and Templates

Template selector should use visual thumbnails, not only a dropdown.

Default optional-section visibility:

- References: off
- Interests: off
- Awards: off unless present and user-enabled
- Publications: off unless present and user-enabled

Keep `Summary`, `Experience`, `Education`, and `Skills` on by default.

## Data Model Considerations

Application records may need additional structured fields:

```ts
type ApplicationAnalysis = {
  overallMatchScore?: number;
  strongEvidence: EvidenceItem[];
  weakOrMissingEvidence: EvidenceItem[];
  recommendedEdits: RecommendedEdit[];
  keywords: {
    present: string[];
    missing: string[];
    reinforced: string[];
  };
};

type ApplicationOutputMetadata = {
  tailoredCvAvailable: boolean;
  coverLetterAvailable: boolean;
  lastExportedAt?: string;
  evidenceUsed?: EvidenceItem[];
  changesApplied?: string[];
};
```

Implementation should prefer additive fields and defensive UI rendering so existing applications continue to load.

## Migration Strategy

1. Add brand tokens and logo components first.
2. Refresh public website and authenticated shell without changing data contracts.
3. Add dashboard and application list UI using existing fields.
4. Add structured match-analysis payloads to generation responses.
5. Add workspace tabs and populate advanced panes progressively.
6. Add stepper flow and keep current generation endpoint contract compatible.
7. Improve preview/export controls.

## Risks and Trade-offs

- **Scope size**: this spans marketing, shell, CV editor, applications, exports, and AI outputs. Implement behind incremental PRs.
- **AI payload reliability**: match analysis requires structured generation outputs. UI must handle missing fields gracefully.
- **Migration risk**: existing application records may not have analysis/export metadata. Treat all new fields as optional.
- **Design drift**: enforce brand tokens and component reuse to avoid inconsistent purple/teal usage.
