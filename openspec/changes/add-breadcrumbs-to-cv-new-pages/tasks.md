## 1. Add shared `NewCvFlowBreadcrumb` component

- [x] 1.1 Create `apps/web/src/components/cv/new-cv-flow-breadcrumb.tsx` as a `'use client'` component that composes the existing `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`, and `BreadcrumbPage` primitives from `@/components/ui/breadcrumb`.
- [x] 1.2 The component SHALL accept `pageLabel: string` and an optional `className?: string`, and render two segments: a `My CVs` link to `/dashboard` (using `next/link`) and a non-link `BreadcrumbPage` showing `pageLabel`.

## 2. Render the breadcrumb in the new-CV flow chrome (above the title)

- [x] 2.1 Extend `apps/web/src/app/dashboard/cv/new/new-cv-page-copy.ts` with a `breadcrumbLabel: string` field on `NewCvPageCopy` and populate it for `/dashboard/cv/new/create` (`"Create CV"`), `/dashboard/cv/new/import/file` (`"Import from file"`), `/dashboard/cv/new/import/url` (`"Import from URL"`), and the unknown-path fallback (`"New CV"`).
- [x] 2.2 In `apps/web/src/app/dashboard/cv/new/new-cv-layout-chrome.tsx`, render `<NewCvFlowBreadcrumb pageLabel={breadcrumbLabel} />` as the first child of the outer `<div className="space-y-6">`, ABOVE the existing title/subtitle/cancel header.
- [x] 2.3 In `apps/web/src/app/dashboard/cv/new/import/file/page.tsx`, drop the `space-y-4` wrapper and the `NewCvFlowBreadcrumb` import — the chrome renders the breadcrumb.
- [x] 2.4 In `apps/web/src/app/dashboard/cv/new/import/url/page.tsx`, drop the `space-y-4` wrapper and the `NewCvFlowBreadcrumb` import — the chrome renders the breadcrumb.
- [x] 2.5 In `apps/web/src/app/dashboard/cv/new/create/page.tsx`, drop the `space-y-4` wrapper and the `NewCvFlowBreadcrumb` import — the chrome renders the breadcrumb.

## 3. Unit tests for the new component and the copy map

- [x] 3.1 Create `apps/web/src/components/cv/new-cv-flow-breadcrumb.test.tsx` (Vitest + Testing Library, jsdom env) verifying that a navigation landmark with `aria-label="Breadcrumb"` is rendered, a `My CVs` link to `/dashboard` is present, the supplied `pageLabel` appears in the current-page segment, and the current-page segment carries `aria-current="page"`.
- [x] 3.2 Mirror the test style of `apps/web/src/components/applications/application-workspace-breadcrumb.test.tsx` (cleanup in `afterEach`, `screen.getByRole` / `screen.getByText` assertions).
- [x] 3.3 Extend `apps/web/src/app/dashboard/cv/new/new-cv-page-copy.test.ts` with assertions covering the new `breadcrumbLabel` field for all known new-CV paths and the fallback.

## 4. Verification

- [x] 4.1 From `apps/web`, run `pnpm test -- new-cv-flow-breadcrumb` (or the package's equivalent vitest target) to confirm the new unit test passes. — 3/3 new tests pass.
- [x] 4.2 From `apps/web`, run `pnpm test` to confirm the import-form, create-form, breadcrumb, and copy-map suites all still pass. — 521/522 pass; the 1 failure is a pre-existing `src/lib/_env-probe.test.ts > env > has localStorage` flake (reproduces on `main` with my changes stashed) and is unrelated to this change.
- [x] 4.3 From the repo root, run `pnpm verify` (or `pnpm lint && pnpm typecheck && pnpm test`) so Biome, Prettier, typecheck, and the full unit suite pass with the new component and page edits. — `pnpm typecheck` clean; `pnpm format:check` clean; `pnpm exec biome check` on the changed files clean; repo-wide `pnpm lint` reports only pre-existing warnings in unrelated files (e.g. `use-import-json-preview.ts`).
- [ ] 4.4 Manually visit `/dashboard/cv/new/import/file`, `/dashboard/cv/new/import/url`, and `/dashboard/cv/new/create` in a running web dev server and confirm the visual order is `Breadcrumb (My CVs → current step) → Title → Subtitle → Cancel → Form` for all three pages, that `My CVs` navigates to `/dashboard`, and that the current-step labels read `Import from file`, `Import from URL`, and `Create CV` respectively. — Requires a running browser; deferred to the human reviewer.

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — auth, CV REST, media, export, template presentation, lifecycle, sections, AI agent, import LLM, import URL, and MCP scenarios (this change touches only the web app's breadcrumb chrome; no API, schema, media, auth, or CV persistence contracts change).

### Update required

- None

### Add

- None
