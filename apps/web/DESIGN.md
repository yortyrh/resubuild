# Web UI design system

Authoritative styling rules for `apps/web`. Read this before adding dashboard panels, CV chrome, or preview surfaces.

## Surfaces and borders

### Card and panel chrome (`surface-soft`)

Use the `surface-soft` utility (defined in `src/app/globals.css`) for elevated dashboard surfaces:

- CV list items and editor section cards (`ResumeItemRow`, `ManagedArraySection` shells)
- Layout / configuration side panels (e.g. `TemplateConfigPanel`)
- **Resume HTML preview frame** (wrapper around the preview `iframe` and its loading skeleton)
- **Applications UI**: workspace panels (job summary, cover letter), list rows on `/dashboard/applications`, and the tailored-CV editor breadcrumb row (`CvApplicationEditorBreadcrumb` + promote icon)

`surface-soft` provides:

- `border-radius: 0.75rem` (`rounded-xl` equivalent)
- Muted fill: `hsl(var(--muted) / 0.35)`
- Border via **inset box-shadow**: `inset 0 0 0 1px hsl(var(--border) / 0.55)` — not a Tailwind `border` class

Do **not** substitute `rounded-lg border`, `rounded-md border bg-white`, or `border-border` for these surfaces; it produces a harsher, inconsistent outline in light and dark mode.

Common mistake: `rounded-lg border p-4` on application workspace `<section>` cards — use `surface-soft text-card-foreground p-4` instead (see `application-workspace.tsx`).

### Form controls and popovers

Interactive inputs, selects, and dropdown shells use explicit borders:

- `border-input` + `rounded-md border` + `bg-background` (see `Input`, `Textarea`, template select on preview page)

### Dividers

- Section footers / action rows: `divider-soft` + `border-t`
- App header: `chrome-divider` + `border-b`

## Applications (`/dashboard/applications`)

| Element                                      | Classes                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Workspace panels (job summary, cover letter) | `surface-soft text-card-foreground` + `space-y-3 p-4`                                                                     |
| Application list row                         | `surface-soft text-card-foreground p-4` inside `ul.space-y-3`                                                             |
| Tailored CV editor breadcrumb                | Application job label in the CV editor header (`CvApplicationEditorBreadcrumb`); promote clone icon beside export/preview |

Compare with `/dashboard` CV list cards when adding new application surfaces.

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

1. If it matches a CV card, list row, side panel, preview frame, or **application workspace/list panel** → **`surface-soft`**
2. If it is an input, button outline, or menu → **`border-input`** pattern from shadcn components
3. Never copy `border` from generated/mock HTML export templates into dashboard chrome
4. After preview or panel changes, compare visually with `/dashboard` CV list cards
5. Before shipping applications UI, read the **Applications** table in this doc — do not use bare `rounded-lg border` on dashboard panels

## Related files

- Tokens and utilities: `src/app/globals.css`
- Preview implementation: `src/app/dashboard/cv/[id]/preview/cv-preview-client.tsx`, `cv-preview-skeleton.tsx`
- Reference panel: `src/components/cv/template-config-panel.tsx`
- Applications workspace: `src/components/applications/application-workspace.tsx`
- Applications list: `src/components/applications/application-list.tsx`
