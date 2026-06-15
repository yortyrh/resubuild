## Why

The `/login` page renders a tabbed control with **Password**, **Email code**, and **Email link** panels inside a card that is vertically centered via `items-center justify-center` in the auth shell. Each panel has a different height (the password form has email + password + forgot-password link + button, the OTP form has email + dev-mailpit hint + button, the magic-link form has email + dev-mailpit hint + button), and Radix's default behaviour unmounts inactive `TabsContent` panels. Switching tabs therefore changes the card height and the centered card jumps vertically on every switch, producing a distracting layout shift on a page that is otherwise meant to be calm and stable.

## What Changes

- `apps/web/src/components/ui/tabs.tsx`: pin every `TabsContent` to the same grid cell (row 2 / column 1) of a single-column grid `Tabs` root, and default `forceMount` to `true` so the cell sizes to the tallest panel. Inactive panels stay in the layout but are hidden with `data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none`.
- `apps/web/src/components/applications/application-workspace.tsx`: drop the now-redundant `space-y-4` on the `Tabs` root — the built-in `mt-4` on `TabsContent` plus the grid layout already produces the desired gap.
- `apps/web/src/components/auth/login-form.test.tsx`: scope the two tab-switching tests to the active tab panel via `within(panel)` because all three panels are now mounted simultaneously.
- `apps/web/src/components/ui/tabs.test.tsx` (new): add four unit tests that pin the grid-stacking contract (single-column grid root, every panel pinned to row 2 / column 1, all panels stay mounted, inactive panels carry the `invisible` + `pointer-events-none` classes).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `auth-passwordless`: the `/login` page's passwordless tab group SHALL reserve the height of the tallest panel so the centered auth card does not shift when the user switches between the Password, Email code, and Email link tabs.
- `application-workspace-tabs`: the workspace tab strip SHALL reserve the height of the tallest panel so the panel does not reflow when the user switches between Job summary, Tailored CV, and Cover letter (which differ dramatically in height).

## Impact

- Web app only — no API, persistence, or auth contract changes.
- `apps/web/src/components/ui/tabs.tsx` changes the default `forceMount` for `TabsContent`. This is a behaviour change for any consumer that relied on Radix's unmount-on-inactive default, but the only other consumer (`ApplicationWorkspace`) benefits from the new layout and was already showing all three panels' work asynchronously.
- The login form's "Email" label is no longer unique in the DOM when passwordless is on. The two affected tests are updated to scope queries to the active panel; production behaviour is unchanged because each panel still has a distinct `id` (`email`, `otp-email`, `link-email`) and labels.
