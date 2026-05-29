## 1. Dependencies and provider setup

- [x] 1.0 Confirm `ai-agent-settings-menu` is merged (or temporarily target `/import/llm/*` aliases with a follow-up rename task)
- [x] 1.1 Add `@tanstack/react-query` to `apps/web/package.json` and `@tanstack/react-query-devtools` as a dev dependency; run `pnpm install`
- [x] 1.2 Create `apps/web/src/lib/queries/query-client.ts` with `createQueryClient()` defaults (`staleTime`, `gcTime`, `retry`)
- [x] 1.3 Create `apps/web/src/components/providers/query-provider.tsx` mounting `QueryClientProvider` and devtools in development only
- [x] 1.4 Wrap authenticated dashboard routes in `apps/web/src/app/dashboard/layout.tsx` with the query provider
- [x] 1.5 Add `apps/web/src/lib/queries/query-client.test.ts` verifying factory options

## 2. Query keys and CV read hooks

- [x] 2.1 Create `apps/web/src/lib/queries/keys.ts` with factories for CV list, detail, sections, AI agent, and PDF import keys
- [x] 2.2 Create `apps/web/src/lib/queries/cv-queries.ts` with `useCvList`, `useCv`, and `useCvSection(cvId, section)` calling existing `api.ts` getters
- [x] 2.3 Add colocated tests in `apps/web/src/lib/queries/cv-queries.test.ts` (mock `api.ts`, wrap with test `QueryClientProvider`)
- [x] 2.4 Remove `dedupeGetRequest` from `apps/web/src/lib/api.ts`; simplify `listCvs`, `getCv`, and section GET functions to call `apiFetch` directly

## 3. Dashboard and editor bootstrap migration

- [x] 3.1 Refactor `apps/web/src/components/dashboard/cv-list.tsx` to use `useCvList`; derive loading/error from query status; remove manual `useEffect` fetch
- [x] 3.2 Add `useDeleteCv` mutation in `apps/web/src/lib/queries/cv-mutations.ts` with list invalidation and toast; wire into `CvList`
- [x] 3.3 Refactor `apps/web/src/components/cv/cv-editor-provider.tsx` to use `useCv(cvId)` instead of mount `useEffect`
- [x] 3.4 Update `apps/web/src/components/dashboard/cv-list` tests (if any) and add/adjust tests for delete mutation behavior

## 4. Section queries and managed array migration

- [x] 4.1 Extend `cv-mutations.ts` with item create/update/delete/reorder mutations wrapping `cv-item-api.ts`; implement cache merge/invalidation per design
- [x] 4.2 Refactor `apps/web/src/components/cv/managed-array-section.tsx` to consume `useCvSection` when hydration is needed; remove `itemsLoading` effect and `refetchItems` prop
- [x] 4.3 Update all section components under `apps/web/src/components/cv/sections/` to pass `sectionKey` instead of `createSectionRefetch(...)`
- [x] 4.4 Replace or thin `apps/web/src/components/cv/use-cv-item-mutation.ts` with mutation hooks (preserve toast/error behavior)
- [x] 4.5 Remove `createSectionRefetch` from `apps/web/src/lib/cv-section-refetch.ts`; keep `sectionItemsNeedHydration` helpers; update `cv-section-refetch.test.ts`
- [x] 4.6 Add tests for section cache merge in `apps/web/src/lib/queries/cv-mutations.test.ts`

## 5. Import and AI agent flows migration

- [x] 5.1 Create `apps/web/src/lib/queries/ai-agent-queries.ts` with hooks for AI agent providers, models, accounts, active account, and PDF job polling (`refetchInterval` while non-terminal)
- [x] 5.2 Refactor `apps/web/src/components/settings/ai-agent-settings.tsx` (from `ai-agent-settings-menu`) to use AI agent query/mutation hooks
- [x] 5.3 Refactor `apps/web/src/components/cv/import-pdf-cv-form.tsx` to use active-account query and PDF job polling hook; remove manual interval loop
- [x] 5.4 Update `ai-agent-settings.test.tsx` and `import-pdf-cv-form.test.tsx` to wrap or mock query hooks

## 6. Create CV and remaining mutations

- [x] 6.1 Add `useCreateCv` mutation with list invalidation; wire `apps/web/src/app/dashboard/cv/new/new-cv-page-client.tsx` and JSON import confirm path
- [x] 6.2 Ensure basics/profile photo flows still call mutations correctly after item hook refactor (`managed-basics-section`, media upload paths unchanged at transport layer)

## 7. Cleanup and verification

- [x] 7.1 Grep `apps/web/src` for orphaned manual CV fetch patterns (`dedupeGetRequest`, `createSectionRefetch`, redundant `loadCvs` callbacks) and remove
- [x] 7.2 Run `pnpm --filter @resumind/web typecheck` and `pnpm --filter @resumind/web test -- --run`
- [x] 7.3 Run `pnpm --filter @resumind/web build` to confirm Next.js client bundle compiles with React Query

## E2E test impact

- **Must pass unchanged** — No API or route changes; existing Playwright/Cypress e2e flows for dashboard list, CV editor, imports, and settings should pass without spec edits.
- **Manual smoke recommended** — After implementation, verify: dashboard list cache on back-navigation, section edit save without full refetch flash, PDF import polling completes, CV delete updates list without hard refresh.
