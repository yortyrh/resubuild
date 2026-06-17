# Design: UI-only Resubuild refresh

## Context

This change is now an initial **UI-only redesign phase**. Resubuild already has the core
workflows: CV import, structured CV editing, CV preview/export, application preparation,
tailored CV output, and cover-letter output. This phase improves visual quality,
hierarchy, navigation clarity, and presentation of existing data without changing AI or
persistence contracts.

Principal visual reference supplied by the requester:

```text
583f8df5-e2f5-4076-ada1-b649c459d557.png
```

The implementation should use that reference as the visual north star: white SaaS
layout, purple/teal brand identity, new logo, polished hero, product mockups, dashboard
preview, rounded cards, subtle gradients, light borders, and clean authenticated screens.

## Design Principles

1. **Visual refresh before product expansion** — improve presentation first; do not add
   new AI outputs, new metadata contracts, or required schema changes.
2. **Preserve existing workflows** — CV import/edit/export, application preparation,
   tailored CV, cover letter, and existing exports must keep working.
3. **Dashboard is additive** — a dashboard may show recent CVs and applications, but
   `My CVs` navigation must still open the CV list.
4. **One dominant action per screen** — destructive actions stay secondary and hidden
   behind menus or confirmations.
5. **ATS-friendly restraint** — marketing can look premium, while CV preview/export stays
   clean and recruiter-friendly.
6. **Consistent brand system** — primary purple `#6d49f4`, secondary teal `#00978a`,
   white surfaces, subtle borders, restrained shadows.

## Reference Design Requirements

The attached reference image should be translated into reusable product assets and
components.

Required visual elements:

- refreshed Resubuild logo with document/CV shape, rebuild/upward arrow, subtle AI/spark
  detail, and purple/teal palette;
- compact square app-icon/favicon version;
- coherent line-icon family for import, edit, AI/spark, export, shield, lock, check,
  table/list, CV card, and application workspace;
- marketing header with logo, navigation, login, and primary CTA;
- hero with `Import your PDF CV.` and `Get a polished CV in seconds.`;
- hero product mockup of the CV editor/preview;
- feature cards for AI PDF Import, Clean Editor, Job Tailoring, and One-Click Export;
- three-step section: Import your CV, Review & edit, Tailor & export;
- benefits row: No watermarks, Structured JSON Resume, Your data is private,
  ATS-friendly exports;
- dashboard/workspace preview with My CVs, recent applications, status badges,
  Import PDF CV CTA, and Create new CV card;
- purple/teal final CTA band and refreshed footer.

## Brand Tokens

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

Preserve existing SEO, metadata, FAQ, sitemap, robots, JSON-LD, public beta messaging,
and public route behavior. Refresh the visual hierarchy in this order:

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

The marketing mockups must not imply unbuilt advanced functionality. Do not show match
analysis, evidence panels, compare mode, generation summaries, or AI recommendation queues
unless those features already exist.

## Authenticated Shell and Routes

The authenticated shell should clearly expose the existing product areas:

```text
Dashboard
My CVs
Applications
```

`Templates` and `Settings` may appear only if they already exist or are safe placeholders.

Route rules:

- `/dashboard` may become the new dashboard landing surface.
- `My CVs` must land on the CV list, not the new dashboard.
- If `/dashboard` currently serves as the CV-list destination, update existing CV-list
  links to the repo’s CV-list route before introducing the dashboard.
- `Applications` must land on the applications list.

## Authenticated Dashboard

Allowed as a lightweight aggregate view:

- welcome header;
- recent CVs;
- recent applications;
- simple counts derivable from existing loaded data;
- primary CTAs to existing routes: Import CV and Prepare application.

Avoid in this phase:

- AI recommendations;
- average match score;
- missing keyword warnings;
- generated improvement queues;
- any dashboard item requiring new AI/data contracts.

## My CVs List

Redesign My CVs as a polished grid/list of CV thumbnails or preview cards.

Each card uses existing data only:

- CV name/title;
- headline/label if available;
- updated date if available;
- thumbnail or fallback placeholder;
- existing open/edit/preview/export actions;
- overflow menu for secondary/destructive actions.

Thumbnail generation must be non-blocking and must fall back to a placeholder if
unavailable.

## Applications List

Prefer a table or card/table hybrid for scanning applications.

Suggested fields using existing data:

- Role
- Company
- Status, if available
- Base CV, if available
- Updated or created date, if available
- Existing outputs/actions, if available
- Open
- More

Delete should move to `More` or a confirmation flow. Do not add required match scores or
generated metadata.

## Application Workspace

This phase polishes the current workspace rather than replacing it.

Allowed:

- new shell, cards, tabs, buttons, icons, and spacing;
- clearer grouping of existing actions;
- improved empty/loading states;
- label renames only when behavior is unchanged.

Avoid:

- `Evidence used` panel;
- compare mode;
- generation summary;
- match analysis tab;
- recommended edits;
- changes-applied summary;
- new export-history surfaces;
- new structured AI metadata.

## Prepare Application

Improve the layout while keeping the same data and submission behavior.

Allowed:

- cleaner source selector cards for existing source types;
- better base CV selector presentation;
- simpler optional-instructions visual treatment;
- optional stepper-style presentation only if it does not add required fields or change
  the submission contract.

Avoid new generation stages, required review steps, new payload fields, or new AI outputs.

## CV Editor and Preview/Export

Keep existing editing and export behavior. Polish section navigation, cards, selected
states, buttons, preview toolbar, template selector, and export controls. Add template
thumbnails only where safe.

Avoid a new `Improve with AI` mode, new AI action cards, new generated suggestions, or new
data contracts.

## Data Model Considerations

No required schema changes are part of this phase. Use existing data defensively, show
placeholders when data is missing, and avoid migrations.

## Migration Strategy

1. Add brand tokens and logo/icon components.
2. Refresh public website using the reference design.
3. Update authenticated shell styling while preserving current route intent.
4. Add dashboard as an additive aggregate view.
5. Ensure My CVs navigation lands on the CV-list route.
6. Redesign My CVs as thumbnails/cards using existing data.
7. Redesign Applications as a table/card-table using existing data.
8. Polish current application workspace without advanced panes.
9. Polish prepare application without changing payloads.
10. Polish CV editor and preview/export controls.

## Risks and Trade-offs

- Scope creep into AI features.
- Route regression if `/dashboard` changes without preserving My CVs behavior.
- Design drift away from the reference image and purple/teal tokens.
- Thumbnail performance; thumbnails must be lazy and non-blocking.
- User surprise from hiding previously visible content; avoid changing default content
  visibility unless already supported.
