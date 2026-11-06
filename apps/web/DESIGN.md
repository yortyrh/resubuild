# Web UI design system

Authoritative styling rules for `apps/web`. Read this before adding dashboard panels, CV chrome, marketing sections, or preview surfaces.

## Idea

Ink and ledger. A CV is a serious document, so the app reads like well-kept records: a quiet green-grey desk, white panels, near-black ink, and one ledger green for actions and focus. The CV itself (preview, thumbnails, marketing figures) is set in the export template's serif; editing happens in plain, labelled forms. Yellow marker is reserved for text that AI tailoring changed.

## Tokens (`src/app/globals.css`)

| Token                                                     | Light     | Dark      | Use                                                    |
| --------------------------------------------------------- | --------- | --------- | ------------------------------------------------------ |
| `--desk` (`bg-desk`)                                      | `#EEF1EF` | `#101512` | page ground: body, dashboard `<main>`, marketing pages |
| `--card` / `--background`                                 | `#FFFFFF` | `#171C19` | panels, inputs, popovers                               |
| `--foreground`                                            | `#17201C` | `#E8EDE9` | text (ink)                                             |
| `--muted-foreground`                                      | `#5B6661` | `#9AA59F` | secondary text, dates, hints                           |
| `--border` / `--input`                                    | `#CFD6D2` | `#2C3330` | hairlines, control borders                             |
| `--primary` / `--ring`                                    | `#1E6B52` | `#6CC2A0` | ledger green: primary actions, focus, active nav       |
| `--marker`                                                | `#F2D04B` | same      | only for AI-changed text (`.marker-text`)              |
| `--shadow-ink`                                            | `#131B17` | same      | overlays, shadows, the dark marketing band             |
| `--page`, `--page-ink`, `--page-ink-muted`, `--page-rule` | fixed     | fixed     | the printed page; identical in both schemes            |

Values are HSL triplets: use `hsl(var(--x) / alpha)`. Dark mode follows `prefers-color-scheme`.

Type:

- `font-sans` is IBM Plex Sans (variable, with a width axis). Page and section headings use `.display` (85% width, semibold, tight leading); card and dialog titles use `.wide`. Scale: 12px hints, 13px labels, 14px body and inputs, 15px entry titles, 28px section titles. Dates and counts use `tabular-nums`.
- `font-resume` is the export template stack (Georgia, Cambria, Times). Use it only for CV content.
- `font-mono` (Geist Mono) is for the JSON editor and code only.
- No ALL-CAPS labels, no eyebrow labels above headings, no gradients, no arrows appended to button text.

Radius: `--radius` (0.5rem) for panels; buttons, inputs, tabs and chips use `rounded-md`, so controls share one shape; the CV page uses a small radius (0.25rem) so it reads as paper. No pill buttons.

Logo: `components/brand/brand-logo.tsx`. `BrandMark` is the page-and-rising-arrow mark (page in `currentColor`, arrow and spark in `--primary`); `BrandLogo` adds the "Resubuild" wordmark as live text. `public/icon.svg` is the same drawing with fixed colors; `pnpm icons:generate` (also run by `pnpm build`) renders the PNG icons and `src/app/favicon.ico` from it.

## Surfaces

### Panels (`surface-soft` / `paper`)

`surface-soft` (alias `paper`) is a white card with a 1px `--border` ring (box-shadow, not a `border` class). Use it for dashboard panels: application workspace sections, list rows on `/dashboard/applications`, side panels such as `TemplateConfigPanel`, and the preview frame wrapper.

Do **not** substitute `rounded-lg border`, `rounded-md border bg-white`, or `border-border` for these surfaces.

### The printed page (`cv-paper`)

`cv-paper` is the CV page: `--page` background, `--page-ink` text, `font-resume`, a hairline edge. It re-declares the light token set, so buttons and fields inside it look right in dark mode too. Use it for:

- CV list thumbnails (`CvTemplateThumbnail`) and decorative specimens (`components/brand/cv-specimen.tsx`)
- marketing figures that show CV content

### Form controls and popovers

Inputs, selects and dropdown shells use `border-input` + `rounded-md border` + `bg-background`, with a `--primary` border and a soft ring on focus. Buttons come from `components/ui/button.tsx` (pill shape).

### Dividers

- Section footers / action rows: `divider-soft` + `border-t`
- App header: `chrome-divider` + `border-b`

## CV editor: forms

Section pages are capped at `max-w-[52rem]` and show entries as `surface-soft` cards (`ResumeItemRow` in `components/cv/cv-item-ui.tsx`):

- Dated sections pass `dates` (from `formatDateRange` / `formatIsoDate`, e.g. `Mar 2022 – Present`); they render in a fixed left date rail so the section scans like a timeline. Undated sections omit it.
- Title 15px semibold, subtitle `text-foreground/80`, `meta` muted, body capped at 75ch.
- Actions sit top right and are always visible: move up/down (icon), cross-section move (ghost), Edit (outline), Delete (icon). Drag handle on the left.

Editing replaces the card with `ResumeItemForm` / `SectionCreateForm`: a white card with a `ring-primary/50` edge, a title ("Edit work entry", "New work entry"), and a Save / Cancel bar that is `sticky bottom-0`. Escape cancels.

Inside the form (`components/cv/form-fields.tsx`):

- `FormGroup` titles a group of fields; the title sits in a left column on `md+`. `FieldRow` puts two fields side by side from `sm`.
- `TextField` has a visible label, an optional one-line hint under the label, and an error under the control. Use `markdown` only for long text (summaries, descriptions, reference text); it renders `MarkdownEditor` with `deferUntilFocus`, an input-like box that loads MDXEditor on click.
- `IsoDateField` has a small Year / Month / Day switch beside its label. Put "leave the end date empty" hints under the date row, not on one field, so both inputs stay aligned.
- `BulletListField` (`components/cv/bullet-list-field.tsx`): one bordered, auto-growing plain-text field per bullet for highlights and courses. Never use the rich editor for single-line values.
- `TagsInput`: chips and the text field in one input-sized box.
- Empty sections show a dashed box with one line saying what belongs there, then the Add button.

## Marketing pages

`(marketing)` pages use `landing-root` (desk background) and `components/landing/band.tsx` (`Band`, `BandHeading`): left-aligned content in a `max-w-6xl` band, sections separated by a top hairline, one dark band for ownership. Headings use `.display`. The only non-interactive motion is the hero's typed highlight (`compose-hero.tsx`), which respects reduced motion. Numbered markers appear only for real sequences (how it works). `components/landing/landing.css` holds the hero keyframes and the features-page illustrations.

## Applications (`/dashboard/applications`)

| Element                                          | Classes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace panels (job summary, cover letter)     | `surface-soft text-card-foreground` + `space-y-3 p-4`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Application list (data table)                    | `/dashboard/applications` renders the list through the shadcn `DataTable` pattern (TanStack Table + `<Table />` primitive in `components/ui/table.tsx` + `application-data-table.tsx` + `application-data-table-columns.tsx`). The whole table is wrapped in `surface-soft text-card-foreground overflow-hidden`; column headers use `bg-muted/30` + a sentence-case 13px label; body rows render the 4 columns `Company                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Position | Application status | Actions`. Company and Position cells are `Link`to`/dashboard/applications/[id]`; the Status cell renders a coloured status dot + label (`Queued`/`Running`/`Ready`/`Failed`) or `Updating…`with a spinner when`updateInProgress`is true. The Actions cell hosts the row-scoped`Update`(outline) and`Delete`(destructive) buttons — the Update button is disabled with the`Updating…`label while`updateInProgress` is true. |
| Application list (mobile card view, `<md`)       | When the `DataTable` is given a `renderCard` slot, the same `data` is also rendered as a stacked list of cards below the `md` breakpoint (and the table hides at `<md`). Each card uses `surface-soft text-card-foreground p-4` (`application-row-card.tsx`): top row stacks Company (primary link, `text-base font-semibold`) and Position (muted subtitle link) on the left with the 3-dots `ApplicationActionsMenu` on the right; bottom row (`divider-soft border-t pt-3`) shows the status badge / `Updating…` indicator on the left and the `Update` outline button on the right. The card reuses `StatusBadge`, `UpdatingIndicator`, and `ApplicationActionsMenu` from `application-row-display.tsx` so behaviour stays in sync with the table. The skeleton mirrors both views: table skeleton in `hidden md:block` and `surface-soft` card skeletons in `md:hidden`. |
| Tailored CV editor breadcrumb                    | Application job label in the CV editor header (`CvApplicationEditorBreadcrumb`); promote clone icon beside export/preview                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Prepare application page chrome                  | `ApplicationWorkspaceBreadcrumb` (`surface-soft` row) + page header `flex items-start justify-between gap-4` with the title/subtitle on the left and a top-right `Button asChild variant="outline"` Cancel link to `/dashboard/applications`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Prepare application: Job source segmented row    | `surface-soft inline-flex flex-wrap rounded-md p-1` strip holding three `aria-pressed` buttons (`secondary` when active, hover-`accent` when inactive). Exactly one mode selected at a time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Prepare application: Text + Optional instruction | Project `MarkdownEditor` (`@/components/cv/markdown-editor`, default `block` variant) — not bare `<Textarea>`; the value submitted to `POST /applications/prepare` is Markdown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Prepare application: File picker                 | `PrepareApplicationFilePicker` — `surface-soft` row with an outline "Choose file" button + a metadata row (name, size, MIME) and an `X` Remove icon when a file is selected. Client-side enforces the 5 MB cap and the `application/pdf,image/png,image/jpeg,image/webp` MIME allow-list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Compare with `/dashboard` CV list cards when adding new application surfaces.

| Element      | Classes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CV list card | `surface-soft text-card-foreground flex gap-4 p-4`. Layout: a 5×7 thumbnail (`CvTemplateThumbnail`, `w-20 shrink-0`, 8.5:11 aspect ratio, `border-input/40 bg-background rounded-md border shadow-sm`) on the left wrapping the editor `Link`; the right column is a `flex flex-col` with a structured header (name as a `text-xl font-semibold` link to `/dashboard/cv/[id]`, label as a `text-muted-foreground` subtitle when present in `cv.data.basics`), a single contact line showing the first non-empty of `email` → `url` (`ExternalLink` with a `prettyUrl` host-only label) → `phone` (rendered via `ContactLineSegment`), an `Updated …` muted line, a `DropdownMenu` trigger (`MoreHorizontal` icon button) in the top-right of that column, and a `divider-soft` bottom row that hosts a `Button asChild variant="outline"` `Preview` link to `/dashboard/cv/[id]/preview`. When `cv.data.basics` is missing, the card falls back to the single-line `cv.title` and skips the subtitle + contact row. The card-level `DropdownMenu` exposes **Export PDF** and **Export JSON Resume** (both go through `downloadCvPdf`/`downloadCvJson` in `lib/api.ts` + `triggerBrowserDownload` from `lib/download.ts`; the in-flight item shows a `Loader2` spinner + "Exporting …" label, items disable while any export is in progress, failures surface a `sonner` `toast.error`) and `Delete` (destructive, opens `DeleteItemDialog`). The editor link is intentionally not duplicated in the menu — the title and thumbnail are already links. |

## Resume preview (`/dashboard/cv/[id]/preview`)

| Element                | Classes                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preview frame wrapper  | `surface-soft cv-export-preview` + `flex-1`, `min-h-[480px]`; height is set inline from measured document content (no fixed viewport cap)                                        |
| Preview `iframe`       | `block w-full border-0 bg-white` with inline `height` matching content — **no** internal scroll; page scrolls instead. **no** `border`, `rounded-*`, or `shadow-*` on the iframe |
| Layout panel           | `surface-soft` (already)                                                                                                                                                         |
| Loading skeleton frame | Same outer `surface-soft` wrapper; inner `bg-white` only for document-shaped placeholder content                                                                                 |

The white `bg-white` on the iframe (or skeleton inner area) represents the printed résumé page, not app chrome.

## Checklist for agents

When adding or refactoring UI in `apps/web`:

1. If it matches a CV card, list row, side panel, preview frame, **application workspace/list panel**, or the **Prepare application** page chrome (breadcrumb row, segmented Job source row, file picker strip) → **`surface-soft`**
2. If it is an input, button outline, or menu → **`border-input`** pattern from shadcn components
3. Never copy `border` from generated/mock HTML export templates into dashboard chrome
4. After preview or panel changes, compare visually with `/dashboard` CV list cards
5. Before shipping applications UI, read the **Applications** table in this doc — do not use bare `rounded-lg border` on dashboard panels
6. Single-line values (highlights, courses, names, titles) → plain inputs (`TextField`, `BulletListField`). Long-form text on the dashboard (summaries, job description, optional instruction, cover letter) → the project `MarkdownEditor`, not a bare `<Textarea>`; in CV entry forms use `TextField markdown` (which passes `deferUntilFocus`).
7. CV content shown as a document (preview, thumbnails, marketing figures) → `cv-paper` + `font-resume`. The editor itself uses forms and cards in `font-sans`.

## Dashboard sidebar

The authenticated dashboard uses a persistent left sidebar instead of a top header.

| Element                 | Rules                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar rail            | `surface-soft text-card-foreground` with a right-edge `chrome-divider`; the top bar is `bg-desk/85` with a backdrop blur; `md:grid-cols-[auto_1fr]` so the rail shrinks to `4rem` when collapsed                                                                                                                                                        |
| Active nav item         | `bg-accent text-accent-foreground`                                                                                                                                                                                                                                                                                                                      |
| Primary nav             | `DashboardSidebarNav`, `aria-label="Primary"`, links for **My CVs** and **Applications** with `aria-current="page"`                                                                                                                                                                                                                                     |
| Contextual middle group | **Mobile-only** CV section nav (`CvSectionNav`) inside the `Sheet` for `/dashboard/cv/[id]/*` (desktop renders its own left panel inside the editor instead)                                                                                                                                                                                            |
| Settings group          | _Removed_ — AI agent + MCP settings live inside the `UserMenu` dropdown; Security and Import LLM settings are no longer linked from the sidebar.                                                                                                                                                                                                        |
| User footer             | `UserMenu` trigger with avatar, name, and email; dropdown header repeats the avatar/name/email, followed by AI agent + MCP config links and a destructive Sign out.                                                                                                                                                                                     |
| Top bar (all viewports) | `DashboardTopBar` renders a `sticky` `h-14` chrome with the sidebar toggle + route-based breadcrumbs (and a mobile-only "Show menu" button below `md`).                                                                                                                                                                                                 |
| Mobile (< `md`)         | The top bar shows only the "Show menu" button (no logo). Tapping it opens a left `Sheet` containing the same `DashboardSidebar` (always expanded inside the sheet).                                                                                                                                                                                     |
| Content background      | `<main>` uses `bg-desk`; inner column is `max-w-7xl mx-auto` with `px-4 py-6 sm:px-8 sm:py-8`.                                                                                                                                                                                                                                                          |
| CV editor inner panel   | On `lg+`, the CV editor renders its own left section nav (`CvSectionNav` expanded/comfortable, sticky, `lg:w-56`) next to the editor. Below `lg` (tablet/mobile, ≤1024px) the same nav is rendered inside a left `Sheet` drawer, toggled by a "Sections" button (`PanelLeftOpen` icon, `lg:hidden`) anchored at the top-left of the editor actions row. |

The dashboard layout is `md:grid md:grid-cols-[auto_1fr]`. The rail width is driven by `DashboardSidebarContext` (`DashboardSidebarProvider`) — `4rem` when collapsed (icon-only) and `16rem` when expanded. The collapsed flag defaults to `true` on tablets (`md`–`lg`) and `false` on desktop (`lg+`); the user's choice persists in `localStorage` under `dashboard-sidebar-collapsed`. The top-bar toggle button flips the flag on `md+`, and opens the mobile Sheet below `md`.

## Related files

- Tokens and utilities: `src/app/globals.css`
- Editor forms and cards: `src/components/cv/form-fields.tsx`, `cv-item-ui.tsx`, `bullet-list-field.tsx`
- Logo: `src/components/brand/brand-logo.tsx`, `public/icon.svg`
- Marketing: `src/components/landing/`, `src/app/(marketing)/`
- Sidebar primitives: `src/components/dashboard/dashboard-sidebar.tsx`, `dashboard-sidebar-nav.tsx`, `dashboard-sidebar-sections.tsx`, `dashboard-sidebar-shell.tsx`
- Sidebar state: `src/components/dashboard/dashboard-sidebar-context.tsx`
- Top bar: `src/components/dashboard/dashboard-top-bar.tsx`, `use-route-breadcrumbs.ts`
- Preview implementation: `src/app/dashboard/cv/[id]/preview/cv-preview-client.tsx`, `cv-preview-skeleton.tsx`
- Reference panel: `src/components/cv/template-config-panel.tsx`
- Applications workspace: `src/components/applications/application-workspace.tsx`
- Applications list: `src/components/applications/application-list.tsx`
- Applications shared display (status badge / updating indicator / actions menu): `src/components/applications/application-row-display.tsx`
- Applications mobile card view: `src/components/applications/application-row-card.tsx`
