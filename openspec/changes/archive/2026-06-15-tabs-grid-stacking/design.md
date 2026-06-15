## Context

The `Tabs` component in `apps/web/src/components/ui/tabs.tsx` is a thin wrapper around Radix's `TabsPrimitive`. By default, Radix unmounts inactive `TabsContent` panels, so the rendered tree contains only the active panel. This is fine for most consumers, but two pages in the app render their `Tabs` inside a flex container that centres its child vertically:

- `AuthPageShell` centres the auth card with `items-center justify-center` on a `min-h-dvh` wrapper. The card height is therefore the variable that determines the card's vertical position. The passwordless `/login` page puts a tabbed `Password / Email code / Email link` control inside this card, and each panel has a different height, so switching tabs causes the card to jump.
- `ApplicationWorkspace` renders the workspace's `Job summary / Tailored CV / Cover letter` tabs. The Cover letter panel contains a tall `MarkdownEditor`, so switching from the short summary panel to the cover letter panel produces a large reflow that pushes the action buttons around.

A `min-h-[…]` hack on the panel would paper over the symptom for one consumer and would still drift if the panel content ever changed. The right fix is structural: every panel should occupy the same cell, and the cell should size to the tallest panel.

## Goals / Non-Goals

**Goals:**

- Eliminate the vertical layout shift on `/login` when the user switches between passwordless tabs.
- Eliminate the panel reflow on `/dashboard/applications/[id]` when switching between the three workspace tabs.
- Make the fix live inside the shared `Tabs` primitive so future `Tabs` consumers inherit the stable layout.
- Cover the new behaviour with colocated unit tests.

**Non-Goals:**

- Changing the visual design of the tab strip or the panel chrome.
- Changing Radix as a dependency or writing our own headless tabs primitive.
- Modifying API, auth, or persistence behaviour.
- Touching the E2E suite — the change is web-only and the catalog in `openspec/specs/e2e-testing/spec.md` already states that web-only changes must not edit `apps/api/test/e2e/*.e2e-spec.ts`.

## Decisions

### Grid-stacking layout in the shared `Tabs` primitive

The `Tabs` root is a `display: grid; grid-template-columns: 1fr` container. The `TabsList` (or any custom header row) occupies the first auto row, and every `TabsContent` is pinned to row 2 / column 1 via `col-start-1 row-start-2`. Inactive panels stay mounted and overlap the active panel in the same cell; the cell sizes to whichever panel is tallest, so the card never reflows.

`TabsContent` sets `forceMount` to `true` by default so the cell can size to inactive panels too. Callers can still pass `forceMount={false}` to opt into the legacy unmount-on-inactive behaviour if they ever need it.

`TabsContent` hides inactive panels with `data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none`. `visibility: hidden` keeps the element in the layout (so the cell still sizes correctly) while removing it from the tab order and pointer events, which matches the semantic intent of an inactive tab panel.

Alternatives considered:

- **`min-h-[Xrem]` on `TabsContent`** — easy, but the value is arbitrary and would have to be tuned for each consumer. The `MarkdownEditor` in the cover-letter panel alone can exceed any reasonable fixed min-height. Rejected.
- **Position absolute on inactive panels with `display: none` on inactive panels** — `display: none` removes the panel from the layout, which collapses the cell. Same problem as the original unmount behaviour. Rejected.
- **Measure panels with `ResizeObserver` and set the wrapper height in JS** — would work but is heavier, brittle to SSR, and not necessary when a CSS-only solution exists. Rejected.

### Drop `space-y-4` from `ApplicationWorkspace`'s `Tabs` root

The application-workspace's `Tabs` had `className="space-y-4"` which added `margin-top: 1rem` to every `TabsContent` (the second and subsequent children of the root). With the new grid layout, the `TabsContent`'s built-in `mt-4` already provides the gap between the header row and the panel row, and `space-y-4` would double it. The class is removed.

Alternatives considered:

- **Keep `space-y-4` and remove `mt-4` from `TabsContent`** — would require touching every existing `Tabs` consumer. The chosen direction is the inverse: keep the `TabsContent` default and clean up the one workspace consumer. Chosen.

### `LoginForm` tests scope to the active panel

With `forceMount` on, all three passwordless panels are in the DOM simultaneously, which means three distinct `<Label htmlFor="email">…</Label>` elements (one per panel, with different input ids). The two tab-switching tests in `login-form.test.tsx` therefore switch from `screen.getByLabelText('Email')` to `within(activePanel).getByLabelText('Email')` so they target only the active panel's input.

Alternatives considered:

- **Re-label the panels** (e.g. "Email — sign in with code") to make each label unique — would change the user-visible copy just to satisfy tests. Rejected.
- **Use `getAllByLabelText` and `.at(0)`** — fragile and still doesn't reflect the user intent (the test wants to type into the _active_ panel). Rejected.

## Risks / Trade-offs

- **Behaviour change for other `Tabs` consumers** → Only `ApplicationWorkspace` is the other consumer in the repo. The workspace also benefits from the new layout (the Cover letter panel no longer pushes the action buttons around). Audited via `grep "from '@/components/ui/tabs'"`; no other consumers exist.
- **Inactive panels are now always mounted** → A small extra DOM cost. The passwordless panels are small forms; the workspace panels are larger but the user only sees one at a time and the rest are `visibility: hidden`. Acceptable.
- **`visibility: hidden` removes inactive panels from the accessibility tree** → This matches Radix's default behaviour (inactive panels are unmounted, which has the same accessibility effect) and matches the user mental model of "only the active tab is visible". The `TabsTrigger`s still drive the tab order and screen-reader navigation, so the active panel remains reachable. No new a11y regression.
- **The change affects the default `forceMount` of `TabsContent`** → Callers that previously relied on the unmount-on-inactive default (for example, to tear down expensive child components) can opt out with `forceMount={false}`. Documented inline on the component.

## Migration Plan

No data migration. The change ships behind a regular web app deploy:

1. Deploy `tabs.tsx` and the consumer updates.
2. Smoke-test `/login` (switch between Password / Email code / Email link) and `/dashboard/applications/[id]` (switch between Job summary / Tailored CV / Cover letter) in the deployed environment.
3. Roll back by reverting the `tabs.tsx` / `application-workspace.tsx` / `login-form.test.tsx` / `tabs.test.tsx` changes — the only persisted surface affected is the rendered DOM, and there is no migration script.

## Open Questions

None.
