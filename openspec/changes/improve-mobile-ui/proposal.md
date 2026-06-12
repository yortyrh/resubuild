# Improve mobile UI and visual design

## Why

The web app is functional on desktop but degrades on phones: the CV editor's left section nav occupies a permanent column that wastes width, the Basics section breaks its photo/summary layout, list-page header actions render full text labels that crowd narrow viewports, and the login card sits awkwardly with verbose copy. Additionally, the whole product is rendered in a near-monochrome zinc palette ("too black and white"), giving it an unfinished feel.

## What Changes

- **Login page (mobile)**: shorten title/subtitle copy, fix vertical centering so there is no dead space band above the card on small viewports, and tighten card padding on `< sm` screens.
- **CV editor section nav (mobile)**: replace the always-visible left icon strip with a mobile-appropriate navigation (off-canvas drawer via the existing `Sheet` component, opened from the breadcrumb row); keep the current collapsible sidebar for `md+` (tablet/desktop). Fix the broken `auto/collapsed/expanded` toggle behavior on small screens.
- **Basics section (mobile)**: stack the profile photo above the identity block below `sm`, and let the summary/markdown content use the full row width instead of being squeezed beside the 80px thumbnail.
- **List header actions (mobile)**: "New CV" (My CVs), "Prepare application" (Applications), and CV editor header actions (Export/Preview) render icon-only buttons with `aria-label`s below `sm`, full labels at `sm+`. Preview toolbar already follows this pattern at `lg`; align thresholds.
- **Dashboard header (mobile)**: ensure top nav (My CVs / Applications / user menu) fits a 375px viewport without wrapping or overflow.
- **Visual theme**: introduce an accent color palette (primary hue + supporting tones) layered onto the existing HSL CSS-variable tokens in `globals.css`, applied to primary buttons, active nav states, focus rings, links, and selected states — in both light and dark schemes. No layout change, token-level only.

No API, schema, or data changes. No breaking changes.

## Capabilities

### New Capabilities

- `responsive-mobile-ui`: viewport requirements (down to 375px) for login, dashboard header, list pages, CV editor chrome, and preview toolbar — navigation drawers, icon-only actions, stacking rules, and no horizontal overflow.
- `visual-design-system`: accent color token requirements for light/dark schemes, applied consistently to interactive elements while preserving WCAG AA contrast.

### Modified Capabilities

- `cv-editor-ui`: the section navigation requirement changes — below `md` the section list is presented as an on-demand drawer instead of a persistent sidebar; Basics view-mode layout stacks photo and identity on narrow viewports.

## Impact

- `apps/web/src/app/globals.css` — new accent tokens (light + dark).
- `apps/web/src/components/cv/cv-section-layout.tsx`, `cv-section-nav-links.tsx`, `cv-editor-chrome.tsx` — mobile drawer nav, toggle fix.
- `apps/web/src/components/cv/managed-basics-section.tsx`, `cv-item-ui.tsx`, `profile-photo-thumbnail.tsx` — Basics responsive layout.
- `apps/web/src/components/dashboard/new-cv-dropdown.tsx`, `applications/application-list.tsx`, `cv/cv-editor-header-actions.tsx` — icon-only mobile actions.
- `apps/web/src/components/auth/auth-page-shell.tsx`, `auth/login-form.tsx` — login copy and centering.
- `apps/web/src/app/dashboard/layout.tsx` — header fit on narrow viewports.
- `apps/web/src/components/ui/*` — `Sheet` gets first production usage; button variants may pick up accent tokens.
- Tests: colocated Vitest component tests updated/added for nav drawer behavior and icon-only action rendering.
