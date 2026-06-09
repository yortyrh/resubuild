## Why

The application workspace at `/dashboard/applications/[id]` currently shows Job summary, Tailored CV, and Cover letter side-by-side in a two-column grid. On smaller viewports the Cover letter column is forced to scroll, and on large screens users have to look at all three sections at once even when they only care about one. Switching to a single tabbed panel — Job summary, Tailored CV, Cover letter — keeps the focus on the section the user is currently working with, while the last selected tab persists across page reloads via `sessionStorage` so a refresh (or navigating to a different application and back) does not bounce the user to a default tab.

## What Changes

- Replace the two-column grid layout in `apps/web/src/components/applications/application-workspace.tsx` with a single full-width panel driven by the existing shadcn `Tabs` primitive (`@radix-ui/react-tabs`).
- Add three tabs in this order: **Job summary**, **Tailored CV**, **Cover letter**. The Cover letter tab keeps the existing `MarkdownEditor`, copy/print/PDF buttons, and Save button.
- Persist the active tab key in `sessionStorage` under a per-user/session-scoped key (e.g. `application-workspace:lastTab`). On mount, if the stored value is one of the valid tab keys it becomes the initial active tab; otherwise default to `summary`.
- On tab change, write the new active tab key to `sessionStorage`. The key is cleared/ignored if it does not match one of the three valid tab ids.
- Keep `aria` semantics intact: tabs must be keyboard-navigable, and each `TabsContent` panel must keep its content focusable.
- No API or backend changes; the workspace data shape and queries are unchanged.

## Capabilities

### New Capabilities

- `application-workspace-tabs`: Defines the tabbed UI of the application workspace and the contract for which tab is active on first render.
- `application-workspace-tab-persistence`: Defines how the last selected tab is persisted in `sessionStorage`, the storage key shape, and the default fallback.

### Modified Capabilities

- `job-application-preparation`: The workspace rendering no longer shows job summary, tailored CV, and cover letter in a two-column grid; it shows one tab at a time. Requirement text is updated so the workspace SHALL render those three sections inside a tabbed control on `/dashboard/applications/[id]` (delta spec only — capability still requires the three sections to be visible and editable).

## Impact

- `apps/web/src/components/applications/application-workspace.tsx` — replace the `grid` with `Tabs`; add a `useEffect` to read/write `sessionStorage`; extract small content components for each tab panel so the JSX stays readable.
- `apps/web/src/components/ui/tabs.tsx` — reused as-is (shadcn Tabs already in the project).
- `apps/web/src/lib/...` — optional small helper `useSessionStorageTab` for read/write; otherwise inline in the workspace component.
- No DB, API, or auth changes.
- `apps/web/DESIGN.md` — note that workspace panels use the `Tabs` chrome; the `surface-soft text-card-foreground` rule still applies to the wrapper, but the inner panel borders are now driven by `TabsContent`/shadcn styling, not duplicate `surface-soft` cards per tab.
