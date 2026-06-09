## Context

`apps/web/src/components/applications/application-workspace.tsx` currently lays out the three workspace sections — Job summary, Tailored CV, and Cover letter — in a two-column `grid` (`lg:grid-cols-2`). On narrow screens the cover letter column becomes tall and forces scrolling, and on wide screens the user always sees all three sections at once, which adds noise when the user is focused on, e.g., editing the cover letter.

The project already ships a shadcn Tabs primitive at `apps/web/src/components/ui/tabs.tsx` (built on `@radix-ui/react-tabs`), used in the CV editor for `basics / work / education / …`. The new layout should reuse that primitive for consistency.

The session already stores auth tokens in `sessionStorage` (per the project context: "session tokens via sessionStorage"). The tab preference is per-tab-session, so `sessionStorage` is the right scope — `localStorage` would persist across sessions and surprise the user.

## Goals / Non-Goals

**Goals:**

- One section visible at a time, switchable via keyboard-accessible tabs.
- Last selected tab persists across page reloads within the same browser tab session.
- Cover letter editor, copy/print/PDF actions, and Save button remain functional and accessible in the new layout.
- No backend or API changes; the existing data flow and queries are untouched.

**Non-Goals:**

- Persisting tab state across browser tabs or across sessions (no `localStorage`).
- Per-application tab memory (the workspace always reopens on the last tab the user selected in this tab session, regardless of which application they were on).
- A new primitive or styling system for tabs — reuse shadcn `Tabs`.
- A separate route per tab (`/summary`, `/tailored`, `/letter`).

## Decisions

### Decision: Use shadcn `Tabs` with `defaultValue` from `sessionStorage`

`Tabs` is uncontrolled after mount and supports `defaultValue` for the initial render. We set `defaultValue` once on first render from a `useState` initializer that reads `sessionStorage`. After that, Radix handles tab changes internally; we add an `onValueChange` handler that writes the new value back to `sessionStorage`.

**Alternatives considered:**

- _Controlled `value` + `setValue`_: more code, more re-renders, and the only reason we'd need it is to write to `sessionStorage`, which we can do in `onValueChange` without owning the state.
- _URL hash routing (`#letter`)_: would survive a reload and be shareable, but the user did not ask for deep links and a route change is heavier than `sessionStorage`.

### Decision: Storage key `application-workspace:lastTab`

A single, namespaced key keeps it obvious where the value comes from and avoids collisions with other preferences. Possible alternative: scope the key by user id, but `sessionStorage` is already per-tab and is wiped when the tab closes; there is no need to also scope by user.

### Decision: Three valid tab ids — `summary`, `tailored-cv`, `cover-letter`

Ids are stable strings (no spaces, no translations yet) so they can be safely stored in `sessionStorage` and matched on rehydrate. If the stored value is not one of these three, fall back to `summary`.

### Decision: Single `surface-soft` wrapper around the Tabs

The current layout uses two `surface-soft` panels. With tabs we wrap the whole `Tabs` in one `surface-soft text-card-foreground` container; each `TabsContent` reuses the same surface but the tab strip itself uses shadcn's `bg-muted` chrome. This avoids three nested `surface-soft` cards (which would produce visible double borders) and matches the `Tabs` look used elsewhere in the app.

### Decision: Keep cover letter `MarkdownEditor` ref/effects inside the workspace

The `useRef<MarkdownEditorHandle>` and the `useEffect` that hydrates it from `data.coverLetter` live in the parent so the editor survives tab switches. Switching tabs does not unmount the `MarkdownEditor` (Radix keeps inactive `TabsContent` in the DOM with `hidden` unless we pass `forceMount`), so the ref stays valid.

## Risks / Trade-offs

- [Inactive tabs not being unmounted could keep the Markdown editor mounted and the draft state in memory] → Acceptable: the current code already keeps the draft in `letterDraft` state, and Radix's default behavior keeps DOM nodes. We do not pass `forceMount`, so panels are conditionally rendered, but Radix's `TabsContent` is hidden via `data-state`, not removed, by default.
- [Storing a stale tab id in `sessionStorage` (e.g. after we rename a tab)] → Mitigation: validate against the allow-list of three ids on read; ignore and fall back to `summary` if it does not match.
- [Visual regression on desktop where two columns are visible today] → Acceptable: a tabbed single-column workspace is intentionally a different layout. The Acceptance criteria in tasks.md includes a manual visual check on both viewport widths.
- [Keyboard users: tab order across the three panels] → Use the Radix `Tabs` defaults; the tab list is a `role="tablist"` and arrow-key navigation works out of the box. No extra ARIA needed.

## Migration Plan

No data migration. Rollout:

1. Land the change behind the existing `/dashboard/applications/[id]` route — no new flag, no feature toggle needed because the new layout is purely presentational and the three sections are still all reachable.
2. Roll back by reverting the commit; the previous two-column grid restores cleanly because we keep the same component file.

## Open Questions

- None at proposal time. If a reviewer wants per-application tab memory later, that would be a separate change with a different storage key (e.g. `application-workspace:lastTab:<applicationId>`).
