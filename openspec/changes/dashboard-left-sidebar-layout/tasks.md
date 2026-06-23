## 1. Build the sidebar primitives

- [x] 1.1 Create `apps/web/src/components/dashboard/dashboard-sidebar.tsx` with logo, primary nav (My CVs, Applications), route-aware contextual middle group, settings group, and user/sign-out footer.
- [x] 1.2 Create `apps/web/src/components/dashboard/dashboard-sidebar-nav.tsx` (replaces `dashboard-top-nav.tsx`) containing the vertical primary nav items and active-state logic, preserving `aria-label="Primary"` and `aria-current="page"`.
- [x] 1.3 Create `apps/web/src/components/dashboard/dashboard-sidebar-settings.tsx` for the bottom settings group (AI agent, MCP, Import LLM, Security links).
- [x] 1.4 Create `apps/web/src/components/dashboard/dashboard-sidebar-sections.tsx` to render `CvSectionNav` inside the sidebar when the route matches `/dashboard/cv/[id]/*` (excluding `/preview`).
- [x] 1.5 Create `apps/web/src/components/dashboard/dashboard-mobile-header.tsx` with brand wordmark and a hamburger `Sheet` trigger for viewports below `md`.
- [x] 1.6 Ensure all sidebar surfaces use `surface-soft text-card-foreground` and `chrome-divider` for the rail divider; active items use `bg-accent text-accent-foreground`.

## 2. Update the dashboard layout

- [x] 2.1 Refactor `apps/web/src/app/dashboard/layout.tsx` to render a two-column grid (`grid-cols-[16rem_1fr]`) with `DashboardSidebar` on the left and `<main>` on the right.
- [x] 2.2 Remove the existing top `<header>` containing `DashboardTopNav` and `UserMenu` from the layout.
- [x] 2.3 Add the mobile `DashboardMobileHeader` above `<main>` for viewports below `md`; the header opens a left-side `Sheet` containing `DashboardSidebar`.
- [x] 2.4 Adjust `<main>` horizontal/vertical padding so it no longer compensates for a top header (e.g., `px-4 py-4` or similar) while keeping `max-w-6xl` content centering.
- [x] 2.5 Verify the layout still exports `robots` metadata with `index: false` and `follow: false`.

## 3. Integrate CV section navigation into the sidebar

- [x] 3.1 Update `apps/web/src/components/cv/cv-section-layout.tsx` to remove the `<aside>` section rail and the mobile section Sheet.
- [x] 3.2 Remove `CvSectionNavToggle` and the `CvSectionLayoutContext` from `cv-section-layout.tsx`.
- [x] 3.3 Remove `<CvSectionNavToggle>` from `apps/web/src/components/cv/cv-editor-chrome.tsx`.
- [x] 3.4 Ensure `CvSectionNav` from `cv-section-nav-links.tsx` can be rendered inside `DashboardSidebar` with `navState="expanded"` and `density="comfortable"`.
- [x] 3.5 Parse the `cvId` from the pathname inside the sidebar (or accept it via context) so section links point to the correct CV.

## 4. Integrate preview tools into the sidebar

- [x] 4.1 Create `apps/web/src/components/dashboard/dashboard-sidebar-preview-context.tsx` to expose preview state (template catalog, selected template, layout config, export handlers) from `CvPreviewClient` to the sidebar.
- [x] 4.2 Wrap `CvPreviewClient` in the preview context provider and remove its top toolbar (Back, Layout toggle, Template, Print, JSON, PDF).
- [x] 4.3 Remove the inline `TemplateConfigPanel` and the layout `Sheet` from `CvPreviewClient`; the panel content now lives in the sidebar.
- [x] 4.4 Create `apps/web/src/components/dashboard/dashboard-sidebar-preview.tsx` to render the preview-tools group (template select, `TemplateConfigPanel`, export/print actions, back link) inside the sidebar when the route matches `/dashboard/cv/[id]/preview`.
- [x] 4.5 Ensure preview controls in the sidebar update the preview iframe and trigger downloads exactly as the current toolbar does.

## 5. Update supporting components

- [x] 5.1 Update `apps/web/src/components/dashboard/user-menu.tsx` to remove the AI agent, MCP, Import LLM, and Security links; keep the avatar trigger and sign-out action.
- [x] 5.2 Update `apps/web/src/components/dashboard/dashboard-shell-skeleton.tsx` to mirror the new two-column sidebar + main skeleton layout.
- [x] 5.3 Delete `apps/web/src/components/dashboard/dashboard-top-nav.tsx` once its replacement is in place and imported correctly.
- [x] 5.4 Add or update shared icons/navigation constants if needed (e.g., centralize the primary nav item list in `dashboard-sidebar-nav.tsx`).

## 6. Update tests and add coverage

- [x] 6.1 Replace `dashboard-top-nav.test.tsx` with `dashboard-sidebar-nav.test.tsx`, asserting both primary nav links, active-state `aria-current="page"`, and `aria-label="Primary"`.
- [x] 6.2 Update `user-menu.test.tsx` so it no longer asserts settings links; add an assertion that the sign-out action remains reachable.
- [x] 6.3 Update `dashboard-shell-skeleton.test.tsx` (or add one) to assert the skeleton renders a rail placeholder and a main-content placeholder.
- [x] 6.4 Add `dashboard-sidebar.test.tsx` covering logo link to `/dashboard`, presence of My CVs / Applications / settings links, bottom-region avatar/sign-out, and the route-aware middle group.
- [x] 6.5 Add `dashboard-mobile-header.test.tsx` (or cover within sidebar tests) asserting the "Open menu" button, Sheet open state, and link click closing the Sheet.
- [x] 6.6 Update `cv-section-layout` tests to remove assertions about the section rail/drawer; add assertions that `CvSectionNav` is no longer rendered by the layout.
- [x] 6.7 Update `cv-editor-chrome` tests to remove assertions about `CvSectionNavToggle`.
- [x] 6.8 Update `cv-preview-client` tests (or add new ones) to assert the toolbar and inline panel are removed and that the preview context drives the sidebar tools.

## 7. Update documentation and specs

- [x] 7.1 Append a "Dashboard sidebar" section to `apps/web/DESIGN.md` documenting the `surface-soft` panel, `chrome-divider` right edge, active state tokens, route-aware middle group, and mobile Sheet pattern.
- [x] 7.2 Apply the delta spec `openspec/changes/dashboard-left-sidebar-layout/specs/responsive-mobile-ui/spec.md`.
- [x] 7.3 Apply the delta spec `openspec/changes/dashboard-left-sidebar-layout/specs/auth-change-password/spec.md`.
- [x] 7.4 Apply the new spec `openspec/changes/dashboard-left-sidebar-layout/specs/dashboard-sidebar-shell/spec.md`.
- [x] 7.5 Apply the delta spec `openspec/changes/dashboard-left-sidebar-layout/specs/cv-editor-ui/spec.md`.

## 8. Verify

- [x] 8.1 Run `pnpm format:fix` and `pnpm lint`.
- [x] 8.2 Run `pnpm typecheck`.
- [x] 8.3 Run `pnpm test --filter @resumind/web` (or `pnpm test --filter @resumind/web --run`).
- [x] 8.4 Run `pnpm verify` if available; otherwise run the CI-equivalent checks (format, lint, typecheck, test, build).
- [x] 8.5 Manually verify the layout on desktop and a 375px-wide viewport (or via devtools) for `/dashboard`, `/dashboard/cv/[id]/work`, and `/dashboard/cv/[id]/preview` to confirm the sidebar groups, mobile top bar, Sheet, and settings group render correctly.

## E2E test impact

### Must pass unchanged

All E2E scenarios in `local-supabase.e2e-spec.ts` must pass unchanged — this is a UI-only layout change and does not alter auth, REST API contracts, CV/media persistence, or settings endpoints.

- `auth (local Supabase)` — login + `/auth/me` contract unchanged
- `CV REST (local Supabase)` — CV list/get/photo validation unchanged
- `media service (local Supabase)` — upload/stream contracts unchanged
- `CV export (local Supabase)` — template catalog and exports unchanged
- `CV template presentation` — PATCH hidden sections unchanged
- `CV lifecycle (local Supabase)` — PATCH/DELETE unchanged
- `CV sections coverage (local Supabase)` — section CRUD unchanged
- `AI agent catalog (local Supabase)` — settings page route unchanged
- `import LLM config (local Supabase)` — settings page route unchanged
- `import URL validation (local Supabase)` — URL import validation unchanged

### Update required

- None — no API contract changes.

### Add

- None — no new endpoints or backend behavior.
