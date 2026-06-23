## Why

The authenticated dashboard today uses a horizontal top header (logo +
two text links + avatar dropdown) sitting above a single-column
`<main>`. That chrome steals vertical space on every page, limits how
nav can grow as more settings pages are added, and does not match the
shadcn-style dashboard pattern the rest of the product already hints at.

The CV editor adds a second, independent left rail (`CvSectionLayout`)
for navigating between CV sections, and the CV preview page adds a third
left layout panel (`TemplateConfigPanel`) plus a dense top toolbar. These
stacked navigation and tool surfaces fragment the user's mental model
and consume horizontal space.

Converting the dashboard chrome to a single persistent left sidebar —
logo at top, primary nav (My CVs, Applications), a contextual middle
group (CV sections when editing, preview tools when previewing), and
settings + user menu pinned to the bottom — reclaims vertical space,
unifies navigation and tool chrome into one surface, scales gracefully
as settings grow, and aligns with the established `surface-soft` /
`chrome-divider` design tokens. On mobile the sidebar collapses into a
Sheet triggered by a hamburger toggle.

## What Changes

- Replace `DashboardTopNav` (horizontal header nav) with a
  `DashboardSidebar` (left vertical nav) rendered inside
  `apps/web/src/app/dashboard/layout.tsx`.
- The sidebar header shows the Resubuild logo + brand; primary nav
  links "My CVs" and "Applications" occupy the upper region.
- The sidebar renders a **contextual middle group** based on the current
  route:
  - On `/dashboard/cv/[id]/*` (except `/preview`): CV section links
    (Basics, Social profiles, Work, Education, Skills, etc.).
  - On `/dashboard/cv/[id]/preview`: preview tools including template
    selection, layout configuration (Sections, Header fields,
    Experience fields), and export/print actions (Back, Print, JSON
    Resume, PDF).
  - On all other dashboard routes the middle group is omitted.
- Settings links (AI agent, MCP, Import LLM, Security) and the user
  avatar / sign-out live pinned to the bottom of the sidebar.
- Remove the standalone top header that today holds the logo,
  `DashboardTopNav`, and `UserMenu`; the page chrome becomes
  `<Sidebar> + <main>` only on desktop.
- Remove the CV section rail from `CvSectionLayout`; the editor content
  area keeps its header/breadcrumb row but no longer renders its own
  secondary sidebar.
- Replace the preview page's inline `TemplateConfigPanel` and top
  toolbar with controls hosted inside the sidebar's preview-tools group.
  The preview `<main>` area then only shows the rendered CV and a
  minimal header.
- On viewports below the `md` breakpoint the sidebar collapses into a
  Radix `Sheet` opened by a hamburger button in a slim top bar; the
  Sheet renders the same unified sidebar contents.
- Update `DashboardShellSkeleton` so its loading state matches the new
  sidebar + main layout.
- Update the `UserMenu` so the settings links move out of the avatar
  dropdown into the sidebar bottom region. The avatar + sign-out remain
  accessible.
- Update existing tests (`dashboard-top-nav`, `user-menu`,
  `dashboard-shell-skeleton`, `cv-section-layout`, `cv-section-nav`,
  `cv-preview-client`) and add coverage for the new unified sidebar.
- Update `DESIGN.md` and the affected specs to describe the unified
  sidebar pattern and the chrome tokens it uses.

No backend, Nest API, schema, or auth contract changes. **No breaking**
API change.

## Capabilities

### New Capabilities

- `dashboard-sidebar-shell`: defines the persistent left sidebar layout
  for authenticated dashboard routes — logo header, primary nav,
  route-aware contextual group (CV sections / preview tools), pinned
  settings + user region, mobile Sheet variant, and the `surface-soft` /
  `chrome-divider` styling rules.

### Modified Capabilities

- `responsive-mobile-ui`: the "Dashboard header SHALL fit a 375px
  viewport on a single row" requirement is replaced by a sidebar +
  mobile Sheet pattern; the dashboard chrome no longer relies on a
  single horizontal header at 375px.
- `auth-change-password`: the "User sees Security settings in the
  menu" scenario is updated to reflect the new sidebar location
  (settings group in the sidebar bottom region) instead of the
  avatar dropdown.
- `cv-editor-ui`: the CV editor no longer owns a secondary left rail;
  section navigation moves into the global dashboard sidebar.
- `cv-resume-export` (or `cv-template-presentation`): the CV preview
  layout panel and top toolbar move into the global dashboard sidebar's
  preview-tools group.

## Impact

- `apps/web/src/app/dashboard/layout.tsx` — replace `<header>` +
  `DashboardTopNav` + `UserMenu` row with `<DashboardSidebar>` + slim
  mobile top bar.
- `apps/web/src/components/dashboard/dashboard-top-nav.tsx` — replaced
  by `dashboard-sidebar-nav.tsx`.
- `apps/web/src/components/dashboard/user-menu.tsx` — settings links
  removed (now in sidebar); the component still owns the avatar
  trigger + sign-out.
- New files: `apps/web/src/components/dashboard/dashboard-sidebar.tsx`,
  `apps/web/src/components/dashboard/dashboard-sidebar-nav.tsx`,
  `apps/web/src/components/dashboard/dashboard-sidebar-settings.tsx`,
  `apps/web/src/components/dashboard/dashboard-sidebar-context.tsx`,
  `apps/web/src/components/dashboard/dashboard-mobile-header.tsx`,
  plus their tests.
- `apps/web/src/components/cv/cv-section-layout.tsx` — remove the
  `<aside>` section rail and the mobile section Sheet; keep the toggle
  logic only if still needed for a future compact mode, otherwise
  remove `CvSectionNavToggle` and the layout context.
- `apps/web/src/components/cv/cv-editor-chrome.tsx` — remove
  `<CvSectionNavToggle>` from the breadcrumb row.
- `apps/web/src/app/dashboard/cv/[id]/preview/cv-preview-client.tsx` —
  remove the top toolbar (Back, Layout toggle, Template, Print, JSON,
  PDF) and the inline `TemplateConfigPanel` / layout Sheet; expose the
  required state/callbacks through a context so the sidebar preview-tools
  group can render the controls.
- `apps/web/src/components/dashboard/dashboard-shell-skeleton.tsx` —
  restructured to match the new shell.
- `apps/web/DESIGN.md` — append a Dashboard sidebar section to the
  Surfaces and borders / chrome tables.
- `openspec/specs/responsive-mobile-ui/spec.md` — modify (delta) the
  375px-header requirement.
- `openspec/specs/auth-change-password/spec.md` — modify (delta) the
  Security-in-menu scenario.
- `openspec/specs/cv-editor-ui/spec.md` — modify (delta) to remove the
  secondary section-rail requirement and point section navigation to
  the dashboard sidebar.
- `openspec/specs/cv-template-presentation/spec.md` (or the relevant
  export spec) — modify (delta) to move the preview layout panel and
  top toolbar into the sidebar.
