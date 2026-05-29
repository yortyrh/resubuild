## Context

`apps/web` is a Next.js App Router client-heavy dashboard. Server data flows through:

- **`src/lib/api.ts`** — authenticated fetch helpers; `listCvs`, `getCv`, section GETs wrapped in a custom **`dedupeGetRequest`** Map for in-flight deduplication.
- **`src/lib/cv-item-api.ts`** — item mutation helpers (PATCH/POST/DELETE).
- **Components** — manual patterns:
  - `CvList`: `useEffect` + `useState` for list load/delete refresh.
  - `CvEditorProvider`: `useEffect` + `getCv` on mount.
  - `ManagedArraySection`: local `itemsLoading`, `refetchItems` callback, `useCvItemMutation` for saves.
  - `ImportPdfCvForm`, `AiAgentSettings`: chained `useEffect` fetches and manual polling loops.
- **`cv-section-refetch.ts`** — builds one-off refetch callbacks passed into section components.

Auth tokens remain in `sessionStorage` via `getValidAccessToken`; React Query does not change transport or CORS.

## Goals / Non-Goals

**Goals:**

- Single **`QueryClientProvider`** for authenticated dashboard flows.
- **Stable query keys** (`['cv', 'list']`, `['cv', id]`, `['cv', id, 'work']`, etc.) with documented invalidation after mutations.
- Replace manual loading/error state in CV list, editor bootstrap, section hydration, import settings, and PDF job polling with **`useQuery`** / **`useMutation`**.
- Preserve current UX: skeletons while loading, Sonner toasts on success/error, optimistic reorder revert on failure, no full-page refetch after every item save when local merge suffices.
- Remove **`dedupeGetRequest`** once React Query handles deduplication.
- Colocated Vitest coverage for query hooks and updated component tests.

**Non-Goals:**

- Nest API changes or new endpoints.
- Prefetch/dehydrate React Query cache from Server Components.
- Migrating auth login/register forms (direct `fetch` to `/auth/*` stays as-is unless trivial).
- Global offline/persistence (`persistQueryClient`).
- Replacing `CvEditorProvider` resume context with query cache as the sole source of truth for in-progress form edits (local form state remains; queries supply server snapshots).

## Decisions

### 1. TanStack Query v5 as the server-state layer

**Choice:** Add `@tanstack/react-query@^5` and `@tanstack/react-query-devtools` (dev only).

**Alternatives:** SWR — rejected; team request specifies React Query. RTK Query — rejected; no Redux in project.

**Rationale:** Mature cache, mutation APIs, devtools, Vitest-friendly test utilities.

### 2. Provider placement

**Choice:** Mount `QueryClientProvider` in a new `apps/web/src/components/providers/query-provider.tsx` wrapped by `dashboard/layout.tsx` (authenticated shell only). Export a factory `createQueryClient()` for tests.

**Alternatives:** Root `app/layout.tsx` — acceptable but widens scope to public pages that do not fetch CV data.

**Rationale:** Keeps public/auth pages free of query overhead; matches session-gated dashboard.

### 3. File layout: `src/lib/queries/`

**Choice:**

```
src/lib/queries/
  keys.ts              # queryKey factories
  query-client.ts      # defaults + createQueryClient()
  cv-queries.ts        # useCvList, useCv, useCvSection(section)
  cv-mutations.ts      # useCreateCv, useDeleteCv, useCvItemMutations...
  ai-agent-queries.ts  # useAiAgentAccounts, useAiAgentActive, useAiAgentProviders, usePdfImportJob
```

Keep **`api.ts`** and **`cv-item-api.ts`** as pure async functions (transport only).

**Alternatives:** Co-locate hooks next to each component — rejected; duplicates keys and invalidation rules.

### 4. Query key convention

**Choice:**

| Key                                      | Data                                       |
| ---------------------------------------- | ------------------------------------------ |
| `['cv', 'list']`                         | Dashboard list                             |
| `['cv', cvId]`                           | Slim CV header (`getCv`)                   |
| `['cv', cvId, section]`                  | Section arrays (`work`, `skills`, …)       |
| `['ai', 'agents', 'accounts']`           | AI agent account list                      |
| `['ai', 'agents', 'active']`             | Active account summary + `configured` flag |
| `['ai', 'agents', 'providers']`          | Provider catalog                           |
| `['ai', 'agents', 'models', providerId]` | Models per provider                        |
| `['import', 'pdf', jobId]`               | PDF job polling                            |

**Invalidation rules:**

- `deleteCv` → invalidate `['cv', 'list']`.
- `createCv` → invalidate `['cv', 'list']`.
- Item create/update/delete → update section cache via `setQueryData` when response includes item(s); invalidate section query only when order may change (create/delete/reorder).
- Basics patch → update `['cv', cvId]` and local editor state; optional invalidate basics if split later.
- AI agent account create/update/delete/set-active → invalidate `['ai', 'agents', 'accounts']` and `['ai', 'agents', 'active']`.

### 5. Default query options

**Choice:**

- `staleTime`: 30_000 ms for CV list/detail/sections (reduces refetch on tab switch).
- `gcTime`: 5 \* 60_000 ms.
- `retry`: 1 for queries; 0 for 401/403 (surface auth errors immediately).
- `refetchOnWindowFocus`: true for list; false for section queries while editing (avoid clobbering unsaved local drafts — sections use local state until save).

**Alternatives:** `staleTime: 0` — rejected; defeats cache benefit for navigation.

### 6. Section loading in `ManagedArraySection`

**Choice:** Replace `refetchItems` + `itemsLoading` effect with `useCvSection(cvId, sectionKey)`:

- `enabled` when `sectionItemsNeedHydration(items)` **or** section is mounted (via existing `useSectionMount`).
- On successful item mutations, merge into query cache with `setQueryData` (same as today's local merge).
- Remove `createSectionRefetch` from section components; pass `sectionKey` instead.

**Alternatives:** Keep refetch callbacks wrapping `queryClient.fetchQuery` — rejected; hooks are clearer.

### 7. Mutations and toasts

**Choice:** Extend/replace `useCvItemMutation` with `useMutation` wrappers that call existing `cv-item-api` functions and centralize toast + error handling in `onSuccess`/`onError`. Keep the same success messages.

**Alternatives:** Inline mutations in each component — rejected; duplicates toast logic.

### 8. PDF import polling

**Choice:** `useQuery` with `refetchInterval` (e.g. 2s) while `status` is `queued` or `running`; stop when `succeeded` or `failed`. Replace manual `setInterval` in `ImportPdfCvForm`.

**Alternatives:** `useMutation` + recursive setTimeout — rejected; Query polling is built-in.

### 9. Testing strategy

**Choice:**

- Hook tests: `QueryClientProvider` + `renderHook` from `@testing-library/react` with a fresh `QueryClient` per test (`retry: false`).
- Component tests: mock module `@/lib/queries/cv-queries` etc., or wrap with test `QueryClientProvider`.
- Keep existing API function mocks where tests already mock `@/lib/api`.

**Rationale:** Matches colocated Vitest convention; avoids real network.

### 10. Remove `dedupeGetRequest`

**Choice:** Delete after all GET consumers use `useQuery`. Plain `apiFetch` in `listCvs`, `getCv`, section getters.

## Risks / Trade-offs

- **[Stale UI after mutation]** → Prefer `setQueryData` for item CRUD; invalidate on create/delete/reorder; document rules in `keys.ts`.
- **[Double fetch on editor mount]** → `CvEditorProvider` uses `useCv`; sections use `useCvSection` only when mounted — acceptable; slim header query is cheap.
- **[Test churn]** → Update mocks incrementally per component; shared `createTestQueryClient()` helper.
- **[Bundle size]** → TanStack Query ~13kB gzip; acceptable for dashboard app.
- **[Auth expiry mid-query]** → Existing `getValidAccessToken` refresh runs inside fetchers; failed 401 queries show error UI consistent with today.

## Migration Plan

1. Add dependency + `QueryClientProvider` (no consumer changes yet).
2. Implement `keys.ts`, `query-client.ts`, CV list/detail hooks; migrate `CvList`.
3. Migrate `CvEditorProvider` to `useCv`.
4. Add section queries + mutations; refactor `ManagedArraySection` and section pages.
5. Migrate import LLM settings + PDF polling.
6. Remove `dedupeGetRequest`, `createSectionRefetch`, obsolete loading state.
7. Update tests; run `pnpm --filter @resumind/web test -- --run`.

Rollback: revert web-only commits; no API or DB impact.

## Open Questions

- Should **`router.refresh()`** after CV delete remain? **Proposal:** drop if list invalidation suffices; keep only if Next cache still required for RSC shells.
- **`staleTime` for AI agent provider models** — cache per provider with longer stale time (5 min)? **Proposal:** yes, models catalog is static.
- Devtools in production build? **Proposal:** dynamic import devtools only when `process.env.NODE_ENV === 'development'`.
