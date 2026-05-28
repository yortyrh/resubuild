## Why

The web app manages server state with scattered `useState`/`useEffect` blocks, a hand-rolled in-flight GET deduper in `api.ts`, and ad hoc refetch callbacks for CV sections. That duplicates loading/error/success handling, refetches more than necessary when navigating between dashboard and editor, and makes cache invalidation after mutations easy to get wrong. TanStack Query provides a standard cache, deduplication, background refresh, and mutation invalidation—reducing boilerplate and improving perceived performance without changing API contracts.

## What Changes

- Add **`@tanstack/react-query`** (and devtools in development) to `apps/web` with a root **`QueryClientProvider`** in the dashboard/app client tree.
- Introduce **query key factories** and **hooks** for CV list/detail, section GET routes, AI agent accounts (`/ai/agents/*`), and PDF import job polling—replacing manual fetch effects in components.
- Replace **`dedupeGetRequest`** in `api.ts` with React Query's built-in request deduplication; keep `api.ts` as thin fetch functions (no hook logic in the transport layer).
- Migrate **mutations** (create/update/delete CV, item CRUD, reorder, media upload, import settings) to `useMutation` with targeted **`queryClient.invalidateQueries`** / optimistic updates where already implied by current UI behavior.
- Refactor **`CvEditorProvider`**, **`CvList`**, **`ManagedArraySection`**, import forms, and AI agent settings to consume query/mutation hooks instead of local fetch state.
- Remove obsolete helpers superseded by React Query (**`createSectionRefetch`**, manual **`itemsLoading`** hydration effects where queries cover the same behavior).
- Add **Vitest tests** for query hooks (mocked `QueryClient`) and update component tests that assumed manual loading state.
- **Non-breaking for API**: no Nest route or response shape changes; this is a frontend data-layer refactor only.

## Capabilities

### New Capabilities

- `client-data-fetching`: TanStack Query setup, query key conventions, hooks for CV/import server state, and mutation invalidation rules for the web app.

### Modified Capabilities

- `web-application`: Server state for dashboard and CV editor flows SHALL be managed through TanStack Query hooks rather than ad hoc `useEffect` fetch patterns; existing user-visible behavior (lists, section editing, imports, toasts) SHALL be preserved.

## Dependencies

- Prefer landing **`ai-agent-settings-menu`** first so hooks target `/ai/agents/*` and `AiAgentSettings` (not the legacy import LLM form). Until then, hooks MAY wrap deprecated `/import/llm/*` aliases and be renamed in a follow-up.
- Prefer landing **`improve-import-ui`** before migrating import form components to avoid conflicting edits to `import-pdf-cv-form.tsx` and `import-cv-form.tsx`.

## Impact

- `apps/web/package.json` — add `@tanstack/react-query`, `@tanstack/react-query-devtools` (dev).
- `apps/web/src/lib/query-client.ts` (or equivalent) — shared `QueryClient` defaults (stale time, retry, error handling).
- `apps/web/src/lib/queries/` — query keys, hooks (`useCvList`, `useCv`, `useCvSection`, `useAiAgentAccounts`, `useAiAgentActive`, `usePdfImportJob`, etc.).
- `apps/web/src/lib/api.ts` — remove `dedupeGetRequest`; functions remain pure Promise returners.
- `apps/web/src/components/cv/cv-editor-provider.tsx`, `managed-array-section.tsx`, `use-cv-item-mutation.ts`, `cv-section-refetch.ts`, dashboard/import/settings components — migrate to hooks.
- `apps/web/src/app/dashboard/layout.tsx` (or a dedicated providers module) — mount `QueryClientProvider`.
- Colocated `*.test.ts(x)` for new hooks and updated component tests.
- `openspec/specs/web-application/spec.md` — delta via change specs.
- **Out of scope**: API changes, React Server Components data fetching migration, SSR prefetch/hydration of query cache, auth token storage changes.
