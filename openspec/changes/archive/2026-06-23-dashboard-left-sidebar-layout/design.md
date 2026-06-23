## Context

The authenticated dashboard currently renders a horizontal `<header>` above
`<main>`: brand wordmark on the left, `DashboardTopNav` (My CVs /
Applications links) in the middle, and `UserMenu` (avatar dropdown that
also contains Settings links) on the right. This is implemented in
`apps/web/src/app/dashboard/layout.tsx`.

The CV editor (`/dashboard/cv/[id]/*`) renders a second, independent
left rail inside `CvSectionLayout` for navigating between CV sections.
The CV preview page (`/dashboard/cv/[id]/preview`) renders a third left
panel (`TemplateConfigPanel`) plus a dense top toolbar (Back, Layout,
Template, Print, JSON, PDF). These stacked surfaces fragment navigation
and tool chrome.

The change redesigns the dashboard chrome into a single persistent left
sidebar matching the shadcn-dashboard template pattern: logo at the top,
primary navigation, a contextual middle group that adapts to the route
(CV sections while editing, preview tools while previewing), and
settings / user actions pinned to the bottom. On mobile the rail
collapses behind a hamburger toggle that opens a `Sheet`.

## Goals / Non-Goals

**Goals:**

- Replace the dashboard header with a left sidebar on `md` and above.
- Keep primary nav (My CVs, Applications) visible and persistent on
  desktop.
- Integrate CV section navigation into the global sidebar when the user
  is on `/dashboard/cv/[id]/*` (excluding `/preview`).
- Integrate preview tools (template, layout config, export actions) into
  the global sidebar when the user is on `/dashboard/cv/[id]/preview`.
- Remove the secondary CV section rail from `CvSectionLayout`.
- Remove the preview page's inline layout panel and top toolbar, moving
  those controls into the sidebar.
- Move all settings links (AI agent, MCP, Import LLM, Security) into a
  dedicated bottom region of the sidebar.
- Keep sign-out and the avatar accessible in the sidebar bottom region.
- Preserve current accessibility: landmarks, current-page
  `aria-current="page"`, keyboard focus states, and mobile Sheet focus
  trapping.
- Update the loading skeleton so it matches the new shell.
- Keep the implementation UI-only: no API, auth, or schema changes.

**Non-Goals:**

- Changing the marketing or auth page layouts.
- Adding new settings pages or changing their forms.
- Changing the CV editor content, forms, or preview rendering.
- Introducing a theme toggle or client-side dark-mode switch.

## Decisions

1. **Single `DashboardSidebar` component, shared between desktop rail and
   mobile Sheet.**
   - Rationale: avoids drift between the two views; the Sheet simply
     portals the same `<DashboardSidebar />` content. The sidebar itself
     is a presentational component that accepts an optional `className`
     so callers can apply mobile vs desktop layout wrappers.

2. **DashboardSidebar is a client component that reads the current
   pathname to decide which contextual group to render.**
   - Rationale: the sidebar needs to react to route changes (e.g.,
     navigating from My CVs into a CV editor or preview). Reading
     `usePathname()` in a client `DashboardSidebar` is the simplest,
     most idiomatic App Router approach. The `cvId` for section links is
     parsed from the pathname.

3. **CV sections and preview tools are rendered as a distinct middle
   group in the sidebar.**
   - Rationale: visually separates global navigation from contextual
     editing/preview tools while keeping everything in one scrollable
     surface. The group is labeled (e.g., "CV sections" or "Preview")
     for accessibility.

4. **Preview state is shared between `CvPreviewClient` and the sidebar
   via a lightweight context (`PreviewSidebarContext`).**
   - Rationale: the preview client owns the template catalog, selected
     template, layout config, and export handlers. The sidebar needs
     read/write access to these to render the preview-tools group.
     A context keeps the preview page self-contained while letting the
     global sidebar participate.
   - Alternative considered: prop-drilling from the page down through
     `dashboard/layout.tsx`. Rejected because it would couple the root
     layout to preview internals.

5. **`CvSectionLayout` no longer renders its own rail or Sheet.**
   - Rationale: section navigation is now owned by the global sidebar.
     The layout's remaining responsibility is to wrap the editor in
     `CvEditorProvider` and render the editor chrome (breadcrumbs,
     header actions, section content).
   - `CvSectionNavToggle` is removed from the editor header row; the
     toggle button is no longer needed because the section nav is
     always visible in the sidebar on desktop and reachable via the
     mobile hamburger Sheet on small screens.

6. **`CvPreviewClient` no longer renders the top toolbar, inline layout
   panel, or layout Sheet.**
   - Rationale: those controls migrate to the sidebar's preview-tools
     group. The preview `<main>` area is reduced to a breadcrumb header
     and the rendered CV iframe.

7. **Desktop layout uses CSS Grid (`grid-cols-[16rem_1fr]`) on the
   dashboard root, not fixed/absolute positioning for the rail.**
   - Rationale: keeps the document flow stable, avoids z-index battles,
     and makes the skeleton layout trivial to mirror. The sidebar is
     `sticky top-0 h-screen` within its grid track so long content in
     `<main>` scrolls independently.

8. **Settings links leave the `UserMenu` dropdown and become explicit
   sidebar nav items.**
   - Rationale: the user requested settings "at the bottom of the left
     sidebar panel". The avatar dropdown is reduced to avatar +
     sign-out.

9. **`surface-soft` for the sidebar background, `chrome-divider` for its
   right edge.**
   - Rationale: follows the existing `DESIGN.md` rules for panels and
     chrome. Active nav state continues to use
     `bg-accent text-accent-foreground`.

10. **`DashboardShellSkeleton` mirrors the new two-column grid.**
    - Rationale: the skeleton is shown during session resolution in
      `SessionGate`; if it does not match the new layout, users see a
      jarring chrome swap after login.

## Risks / Trade-offs

- **[Risk]** `DashboardTopNav`, `CvSectionNav`, and the preview toolbar
  have unit tests asserting `aria-label`, current-page semantics, and
  control visibility. Moving them into the sidebar may invalidate those
  tests if the same accessibility contracts are not preserved.
  - **Mitigation**: keep the nav wrappers with their `aria-label`
    attributes, keep `aria-current="page"` on active links, and update
    the tests rather than drop coverage. Preview tools remain
    individually labeled and keyboard-focusable.

- **[Risk]** Removing settings links from the `UserMenu` may break the
  `auth-change-password` spec scenario "User sees Security settings in
  the menu".
  - **Mitigation**: modify the spec scenario to describe the sidebar
    settings group; the link itself and its destination remain the same.

- **[Risk]** Moving preview controls into the sidebar changes the visual
  rhythm of the preview page and may make the preview iframe feel
  narrower.
  - **Mitigation**: the sidebar width (16rem) is comparable to the
    current inline layout panel (12rem) plus the removed left rail
    gutter; the iframe should retain similar effective width on desktop.
    Manual acceptance testing on `/dashboard/cv/[id]/preview` will
    confirm usability.

- **[Risk]** Preview state now lives in a context that must be mounted
  only when the preview page is active.
  - **Mitigation**: the context provider is rendered inside the preview
    page/client component, not in the root layout, so it is only active
    on the preview route. The sidebar safely renders nothing when the
    context is absent.

- **[Risk]** Long settings lists plus CV sections plus preview tools may
  crowd the sidebar on short laptop screens.
  - **Mitigation**: the sidebar rail is `h-screen overflow-y-auto`; the
    grouped structure lets users scroll the entire rail. Primary nav
    and contextual groups remain near the top; settings and user
    actions stay near the bottom but scroll naturally if the viewport
    is short.

- **[Risk]** The Sheet primitive forces a default `p-6` padding and a
  top-right close button.
  - **Mitigation**: pass `className` to `SheetContent` to remove padding
    and hide the close button for the sidebar case, matching the
    existing `cv-section-nav-drawer` pattern.

## Migration Plan

No deployment migration is required; this is a pure UI refactor in
`apps/web`. Rollback is a git revert of the component and layout changes.

Implementation order:

1. Create `DashboardSidebar` and child nav components with desktop-only
   rendering.
2. Update `dashboard/layout.tsx` to use the sidebar grid and remove the
   old `<header>`.
3. Add the mobile top bar + Sheet integration.
4. Integrate `CvSectionNav` into the sidebar when the route matches
   `/dashboard/cv/[id]/*` (excluding `/preview`).
5. Create `PreviewSidebarContext` and move preview toolbar/panel
   controls into the sidebar's preview-tools group.
6. Remove the section rail and Sheet from `CvSectionLayout`; remove
   `CvSectionNavToggle` from `CvEditorChrome`.
7. Remove the toolbar, inline panel, and Sheet from `CvPreviewClient`.
8. Update `DashboardShellSkeleton` to mirror the new layout.
9. Remove/adjust `DashboardTopNav` and update `UserMenu`.
10. Update tests and add sidebar-specific test coverage.
11. Update `DESIGN.md` and affected specs.
12. Run `pnpm verify` (format, lint, typecheck, test).
