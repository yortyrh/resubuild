# Proposal: UI-only Resubuild redesign

## Why

Resubuild already supports the core product workflow: CV import, structured CV editing,
CV preview/export, application preparation, tailored CV output, and cover-letter output.
The current UI works, but it still feels closer to an internal utility than a polished
product. This change should therefore be a **visual and interaction refresh first**, not
a functionality expansion.

This proposal replaces the previous broader redesign scope with a stricter initial phase:

```text
Keep existing capabilities → redesign how they are presented → avoid new AI/data contracts
```

The principal reference is the requester-provided purple/teal website design image:

```text
583f8df5-e2f5-4076-ada1-b649c459d557.png
```

The implementation should treat that image as the visual north star for the marketing
site, logo direction, icon language, dashboard preview, cards, gradients, spacing, and
authenticated UI polish.

Brand colors:

- Primary purple: `#6d49f4`
- Secondary teal: `#00978a`
- White/light surfaces, muted borders, restrained shadows, rounded cards, and
  ATS-friendly visual restraint.

## What Changes

### Public website and brand

- Introduce a refreshed Resubuild logo system based on the reference design:
  - full wordmark + document/rebuild icon;
  - compact app icon / favicon variant;
  - icon set direction using document, edit, sparkle, download, shield, lock, and
    check motifs.
- Update the marketing page to follow the attached design direction:
  - clean white SaaS landing page;
  - purple/teal CTAs, icons, highlights, and soft gradients;
  - hero with a product mockup;
  - feature cards;
  - how-it-works section;
  - benefits/trust row;
  - authenticated workspace preview;
  - final CTA and footer.
- Preserve existing SEO, FAQ, metadata, sitemap, robots, JSON-LD, public beta messaging,
  and public route behavior.

### Authenticated shell and dashboard

- Add a lightweight authenticated dashboard as an aggregate landing surface with recent
  CVs and recent applications.
- The dashboard is allowed, but it MUST NOT replace the current `My CVs` destination
  behavior.
- Any existing navigation/link whose user intent is “go to my CV list” MUST continue to
  land on the CV list, even if that means moving those links from `/dashboard` to
  `/dashboard/cvs` or the repo’s equivalent CV-list route.
- The authenticated shell should use the refreshed logo, brand colors, selected states,
  cards, buttons, and icons.
- Keep the current major areas: CVs, Applications, application preparation, CV
  preview/export, account/user menu. Additional top-level items such as Templates or
  Settings may be shown only if those areas already exist or are safe placeholders.

### My CVs list

- Redesign the CV list as a polished grid/list of CV thumbnails or preview cards.
- Each CV item should show existing data only:
  - CV title/name;
  - optional label/headline;
  - last updated timestamp if available;
  - primary action such as Preview/Open/Edit;
  - existing secondary actions in an overflow menu.
- Thumbnail generation is acceptable as a non-destructive UI enhancement, provided
  failure falls back to a clean placeholder card.
- Do not alter the underlying JSON Resume model.

### Applications list

- Redesign the Applications view as a clear table or card/table hybrid using existing
  application fields.
- Suggested columns/fields:
  - role;
  - company;
  - status if already available;
  - base CV if already available;
  - updated/created date if already available;
  - existing generated outputs if already available;
  - Open action;
  - overflow menu for Delete.
- Hide destructive Delete behind an overflow/menu or confirmation pattern rather than
  making it the dominant red action.
- Do not add required match score, evidence, recommendations, or generated metadata.

### Application workspace

- Keep the existing functional surface and outputs.
- Polish the current workspace visually using the new brand system.
- Keep existing tabs/sections unless they already exist in the app. Do not add
  `Evidence used`, `Compare`, `Generation summary`, or a new structured match-analysis
  workflow in this phase.
- Rename purely ambiguous UI labels only where it does not change behavior. For example,
  `Update` may become `Regenerate` only if the action reruns the same existing generation
  flow.

### Prepare application flow

- Improve the visual layout without changing behavior or backend contracts.
- The existing job source, base CV selector, optional instructions, and submit flow may
  be presented as cleaner cards or a stepper-like layout only if it remains the same user
  task and submits the same payload.
- Do not introduce new required data, new generation stages, or new AI outputs.

### CV editor and preview/export

- Polish the existing editor and preview/export pages using the reference design.
- Add visual template thumbnails or preview cards where safe.
- Improve layout controls and labels, but do not introduce new AI modes or additional
  generation features.
- Keep PDF/print/JSON export behavior functionally unchanged.

## Capabilities

### Modified capabilities

- `landing-page`: update brand, logo, homepage visual structure, public CTAs, benefits,
  product mockups, and dashboard preview while preserving existing SEO and behavior.
- `visual-design-system`: standardize brand tokens, logo usage, icon style, button
  hierarchy, cards, badges, empty states, and focus states using `#6d49f4` and `#00978a`.
- `web-application`: add/polish authenticated dashboard, preserve CV-list navigation
  behavior, redesign CV list as thumbnail cards, and redesign application list as a
  table/card-table view using existing data.
- `job-application-preparation`: visually improve prepare application, applications list,
  and application workspace without adding new AI/data contracts.
- `cv-editor-ui`: visually polish the CV editor and preview/export controls using
  existing editing/export capabilities.
- `cv-resume-export`: improve export controls and template-selection presentation without
  changing export semantics.

## Impact

- **Frontend routes/components:** marketing pages, authenticated shell/navigation,
  optional dashboard page, CV list, applications list, application workspace, prepare
  application form, CV editor, preview/export page, shared logo/icon components.
- **Data model/API:** no required schema changes in this phase. Existing fields must be
  used defensively.
- **AI workflows:** no prompt/schema/output contract changes in this phase.
- **Design system:** update global CSS tokens, semantic color usage, logo assets, icon
  style, focus states, cards, empty states, and buttons.
- **Tests:** focus on visual rendering, route/navigation behavior, non-regression of CV
  import/edit/export, application preparation, cover-letter copy/export if already
  present, and delete confirmation behavior.

## Non-Goals

- Adding `Evidence used` panels for cover letters.
- Adding compare mode between base CV and tailored CV.
- Adding generation summaries, change summaries, or reinforced-keyword reports.
- Adding structured match analysis, score computation, weak/strong evidence, or
  recommended edits.
- Adding new persisted AI metadata, new database columns, or new generation response
  schemas.
- Replacing the underlying JSON Resume data model.
- Changing authentication provider or account security model.
- Automatically applying to jobs.
- Building a CRM, external job-board scraper, or tracking system beyond the existing
  application records.
