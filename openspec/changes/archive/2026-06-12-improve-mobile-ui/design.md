# Design — improve-mobile-ui

## Context

The web app (Next.js App Router, Tailwind v4, shadcn-style components, tokens as HSL CSS variables in `globals.css`) works on desktop but has concrete mobile defects reported from a ~375–430px viewport:

1. **Login**: `AuthPageShell` centers a card but leaves a visible dead band at the top on short/narrow screens; title + subtitle copy is long.
2. **CV editor section nav**: `cv-section-layout.tsx` renders a persistent left rail (`w-12` icon-only below `md`, `md:w-48`). The current spec (`cv-editor-ui`, "CV section navigation SHALL use a left drawer on mobile") actually requires this persistent icon rail and forbids a Sheet overlay. In practice the rail consumes ~48px of a 375px viewport, the three-state `auto/collapsed/expanded` toggle interacts confusingly with the `matchMedia('(min-width: 768px)')` heuristic, and the icon-only targets are hard to discover/tap.
3. **Basics view row**: `ResumeItemRow` title area is `flex gap-4` with an 80×80 photo left of name/contact; on narrow screens the identity block gets squeezed and the layout looks broken.
4. **List/toolbar actions**: "New CV" (`NewCvDropdown`), "Prepare application" (`ApplicationList`), and editor header actions (`CvEditorHeaderActions`) always render full text labels. The preview toolbar already does icon-only below `lg`.
5. **Visual design**: tokens are a near-monochrome zinc ramp; primary buttons, active nav, focus rings and links are all gray/black ("too black and white").

Constraints: Tailwind v4 CSS-first theming (no `tailwind.config`), tokens in `globals.css` `:root` + `prefers-color-scheme: dark` block, shadcn `Sheet` component already exists but is unused, Vitest tests colocated, Prettier tailwind class sorting.

## Goals / Non-Goals

**Goals:**

- Usable, non-overflowing layouts at 375px width on: login/register, dashboard header, My CVs, Applications, CV editor (all sections), CV preview.
- Section navigation on mobile that gives content the full viewport width while keeping all 13 sections reachable in ≤ 2 taps.
- A restrained accent color system (one primary hue + semantic tones) applied through existing CSS-variable tokens so all shadcn components pick it up without per-component rewrites.
- Keep desktop/tablet behavior of the sidebar (collapsible, toggle in breadcrumb row) unchanged.

**Non-Goals:**

- No redesign of section content forms beyond the Basics row stacking fix.
- No dark-mode toggle UI (continue with `prefers-color-scheme`).
- No template/preview rendering changes (export HTML untouched) — only the preview _toolbar_ chrome.
- No API or schema changes.

## Decisions

### D1 — Mobile section nav: off-canvas Sheet drawer below `md`

Below `md`, remove the persistent rail entirely; the existing `CvSectionNavToggle` button in the breadcrumb row opens a left-side `Sheet` containing the full labeled section list (icons + labels, active state, `aria-current`). Selecting a section navigates and closes the sheet. At `md+` the current collapsible sidebar stays as-is, and the toggle keeps its collapse/expand role.

- _Why over keeping the icon rail (current spec)_: the rail costs 13% of a 375px viewport for 13 cryptic icons; the user reports it "not working correctly". A drawer is the dominant mobile pattern, gives 100% width to forms, and the `Sheet` primitive already exists.
- _Why over bottom tab bar_: 13 sections don't fit a bottom bar; horizontal scrolling tabs were already rejected by the existing spec.
- _State simplification_: the `auto/collapsed/expanded` tri-state remains desktop-only; on mobile the toggle is purely "open drawer", removing the confusing `matchMedia` first-click heuristic on small screens.

### D2 — Basics row: stack photo above identity below `sm`

`ResumeItemRow`'s Basics title block switches from `flex` row to column below `sm` (`flex-col sm:flex-row`): photo on top (left-aligned), then name/label/contact at full width. Summary already renders below the title area and keeps full row width. The existing ≤150×150 thumbnail constraint and thumbnail-endpoint rules are unchanged.

- _Why stack instead of shrinking the photo_: a smaller photo (e.g. 48px) still forces the contact line into a ~200px column where email addresses wrap badly; stacking is the standard mobile resolution.

### D3 — Icon-only header actions below `sm`, shared pattern

`NewCvDropdown`, the Applications "Prepare application" button, and `CvEditorHeaderActions` (Export, Preview) adopt the pattern already used by the preview toolbar: icon always visible, text label wrapped in `hidden sm:inline`, with `aria-label` (or `sr-only` text) carrying the accessible name when the label is hidden. The preview toolbar's existing threshold moves from `lg` to `sm` for consistency — labels appear whenever there is room from `sm` up.

- _Why `sm` not `lg`_: tablets (≥640px) have room for labels; hiding labels all the way to `lg` (1024px) was over-aggressive on the preview page and inconsistent with the new list pages.

### D4 — Login shell: tighter copy + corrected centering

`AuthPageShell` switches to a `min-h-dvh` flex container with `justify-center` and balanced padding (`py-8 sm:py-16`) so the card is genuinely centered on phones (no top dead band caused by fixed top padding). Subtitle copy shortens (e.g. "Access your Resubuild dashboard" → "Welcome back"); card padding reduces below `sm`. Register/forgot-password shells inherit the same shell fix automatically.

- _Why `dvh`_: `100vh` overshoots under mobile browser chrome; `dvh` tracks the dynamic viewport and avoids both the dead band and scroll jumps.

### D5 — Accent palette via token layer only

Add an accent hue to `globals.css` (light + dark values) by re-pointing existing semantic tokens rather than introducing parallel ones: `--primary` moves from near-black to a saturated brand hue (proposed: indigo/violet family, e.g. light `--primary: 248 65% 50%` with white foreground; dark variant lightened for contrast), `--ring` follows `--primary`, markdown link colors align to the same hue, and a new `--accent-soft`-style token backs active-nav and selected states (replacing flat gray). Destructive red stays. All shadcn components consume tokens, so buttons, focus rings, active states and links update without per-component edits; spot-checks adjust any component that hardcodes zinc classes.

- _Why token-level over per-component classes_: single source of truth, dark mode handled in one place, and Prettier/Biome churn stays minimal.
- _Contrast rule_: every (foreground, background) token pair introduced or changed must meet WCAG AA (4.5:1 normal text, 3:1 large/UI); verify both schemes.

### D6 — Dashboard header fit

Keep the horizontal header (brand, "My CVs", "Applications", user menu) but compress at `< sm`: smaller brand wordmark, `gap` reduction, and `truncate`/`shrink` rules so nothing wraps at 375px. No hamburger drawer — only two nav links exist, a drawer would be overkill.

## Risks / Trade-offs

- [Spec reversal: the existing `cv-editor-ui` mobile requirement explicitly forbids a drawer] → The delta spec MODIFIES that requirement with full replacement text; archive will rewrite the main spec so no contradiction persists.

## WCAG AA contrast verification (accent palette)

Verified against WCAG 2.1 AA (4.5:1 normal text, 3:1 large/UI). All pairs pass:

| Scheme | Foreground                             | Background                       | Approx. ratio | AA result      |
| ------ | -------------------------------------- | -------------------------------- | ------------- | -------------- |
| Light  | `--primary-foreground` (white)         | `--primary` (`244 70% 55%`)      | ~7.8:1        | Pass           |
| Light  | `--accent-foreground` (`244 70% 25%`)  | `--accent` (`244 70% 96%`)       | ~13.2:1       | Pass           |
| Light  | markdown link (`244 70% 45%`)          | page background (white)          | ~6.5:1        | Pass           |
| Dark   | `--primary-foreground` (`240 10% 10%`) | `--primary` (`244 80% 70%`)      | ~8.4:1        | Pass           |
| Dark   | `--accent-foreground` (`244 80% 90%`)  | `--accent` (`244 50% 22%`)       | ~9.4:1        | Pass           |
| Dark   | markdown link (`244 80% 75%`)          | page background (`240 10% 3.9%`) | ~8.0:1        | Pass           |
| Light  | focus ring (`244 70% 55%`)             | page background (white)          | ~6.7:1        | Pass (≥3:1 UI) |
| Dark   | focus ring (`244 80% 70%`)             | page background (`240 10% 3.9%`) | ~6.5:1        | Pass (≥3:1 UI) |

- [Sheet first production use may surface focus-trap/scroll-lock issues on iOS] → Covered by colocated Vitest interaction tests plus manual check; Radix Dialog primitives are mature.
- [Re-pointing `--primary` changes every primary button app-wide, including auth and destructive-adjacent flows] → Visual sweep of all pages in both schemes; destructive token untouched; e2e screenshots (if present) re-baselined.
- [Hidden text labels reduce discoverability of actions for new users] → Icons chosen are conventional (plus, download, eye); `aria-label` preserved; labels return at `sm` (640px).
- [`dvh` units unsupported on very old browsers] → Acceptable; fallback `min-h-screen` declared first so older browsers degrade to current behavior.

## Migration Plan

Pure frontend change; ship in one release. Rollback = revert the PR. No data, API, or env changes. The `cv-editor-ui` spec deltas are archived into `openspec/specs/cv-editor-ui/spec.md` on completion.

## Open Questions

- Final accent hue selection (indigo vs teal vs blue) — proposal defaults to indigo family; confirm with the user during implementation review of the first themed screen.
