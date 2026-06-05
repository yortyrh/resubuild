## 1. Bump `@mastra/core` and other workspace dependencies

- [x] 1.1 In `apps/api/package.json` bump `@mastra/core` from `^0.20.2` to `^1.38.0`
- [x] 1.2 In `apps/import-agent/package.json` bump `@mastra/core` from `^0.20.2` to `^1.38.0`
- [x] 1.3 In `packages/import-models/package.json` bump `@mastra/core` from `^0.20.2` to `^1.38.0`
- [x] 1.4 In `apps/api/package.json` bump `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` from `^11.1.23` to `^11.1.24`; bump `@nestjs/testing` to `^11.1.24`
- [x] 1.5 In `apps/api/package.json` bump `@supabase/supabase-js` from `^2.50.0` to `^2.107.0`
- [x] 1.6 In `apps/api/package.json` bump `class-validator` from `^0.14.2` to `^0.15.1`
- [x] 1.7 In `apps/api/package.json` bump `jest` from `^29.7.0` to `^30.4.2`; bump `@types/jest` from `^29.5.14` to `^30.0.0`; bump `@types/node` from `^22.19.x` to `^25.9.1`
- [x] 1.8 In `apps/import-agent/package.json` bump `pdf-parse` from `^1.1.1` to `^2.4.5`; bump `vitest` and `@vitest/coverage-v8` from `^3.2.4` to `^4.1.8`
- [x] 1.9 In `packages/import-models/package.json` bump `vitest` and `@vitest/coverage-v8` from `^3.2.4` to `^4.1.8`
- [x] 1.10 In `packages/types/package.json` bump `vitest` and `@vitest/coverage-v8` from `^3.2.4` to `^4.1.8`
- [x] 1.11 In `packages/resume-template/package.json` bump `marked` from `^15.0.12` to `^18.0.4`; bump `vitest` and `@vitest/coverage-v8` from `^3.2.4` to `^4.1.8`
- [x] 1.12 In `apps/web/package.json` bump `next` from `16.2.6` to `^16.2.7`; bump `react` and `react-dom` from `19.2.4` to `19.2.7`; bump `@types/react` from `^19.2.15` to `^19.2.16`; bump `@tanstack/react-query` and `@tanstack/react-query-devtools` from `^5.100.14` to `^5.101.0`; bump `react-hook-form` from `^7.58.1` to `^7.77.0`; bump `lucide-react` from `^0.525.0` to `^1.17.0`; bump `@types/node` from `^20` to `^25.9.1`; bump `vitest` and `@vitest/coverage-v8` from `^3.2.4` to `^4.1.8`
- [x] 1.13 Audit Zod usage in `apps/api/src/**` and `apps/import-agent/src/**` with `rg "from 'zod'" apps/api/src apps/import-agent/src`; if every schema type-checks under v4, bump `zod` to `^4.4.3` in those packages, otherwise pin at `^3.25.76` and file a follow-up
- [x] 1.14 Leave `apps/web/package.json` on `zod@^3.25.67` (paired with `@hookform/resolvers@^5.1.1`); bumping web's Zod is a follow-up
- [x] 1.15 Leave `typescript` at the workspace's current `^5.8.3` / `^5` pins for this change; the v6 bump is a follow-up gated on `pnpm typecheck` (see Decision 8 in `design.md`)
- [x] 1.16 Run `pnpm install` at the repo root to refresh `pnpm-lock.yaml` with all the bumps from 1.1–1.15; commit the lockfile in the same commit

## 2. Apply the v1 Mastra source diff in `apps/import-agent`

- [x] 2.1 In `apps/import-agent/src/workflows/pdf-import.workflow.ts` change `import { Agent } from '@mastra/core/agent';` (already at v1 subpath) to confirm v1; add `id: 'pdf-import-agent'` to the `new Agent({...})` call inside `createAgent`
- [x] 2.2 In `apps/import-agent/src/workflows/website-import.workflow.ts` add `id: 'website-import-agent'` to the first `new Agent({...})` call (inside `generateWebsiteDraft`) and `id: 'website-import-repair'` to the second (inside `generateRepair`); confirm the import is `@mastra/core/agent`
- [x] 2.3 In `apps/import-agent/src/workflows/prepare-application.workflow.ts` add `id: 'prepare-application-agent'` to the `new Agent({...})` call inside `generateJsonFromPrompt`; add `id: 'job-image-transcriber'` to the `new Agent({...})` call inside `normalizeJobPostingText` (the image branch); confirm the imports are `@mastra/core/agent`
- [x] 2.4 In `apps/import-agent/src/tools/transcribe-image-resume.tool.ts` add `id: 'resume-image-transcriber'` to the `new Agent({...})` call; confirm the import is `@mastra/core/agent`
- [x] 2.5 In `apps/import-agent/src/tools/transcribe-pdf-with-vision.tool.ts` add `id: 'pdf-ocr-transcriber'` to the `new Agent({...})` call; confirm the import is `@mastra/core/agent`
- [x] 2.6 Update `apps/import-agent/src/tools/extract-pdf-text.tool.ts` to use the v2 `pdf-parse` export shape (callable default vs. named exports — match the v2.4.5 documented surface from the package README); keep the `pdfBuffer → { text, numpages }` result-shape contract
- [x] 2.7 In `apps/import-agent/src/**.spec.ts` files (and any `.test.ts` colocated unit tests), confirm no `mastra.get*` plural getters, no `agent.fetchMemory()`, and no `createTool` calls are used (audit with `rg`); the v1 migration surface does not touch any of these
- [x] 2.8 Run `pnpm --filter @resumind/import-agent typecheck` and resolve any type errors introduced by the v1 `Agent` constructor (most likely the `model: { id, apiKey }` typing)
- [x] 2.9 Run `pnpm --filter @resumind/import-agent test -- --run` and confirm all unit tests still pass against the bumped deps

## 3. Apply the v1 Mastra source diff in `apps/api`

- [x] 3.1 In `apps/api/src/ai-agent/ai-agent.service.ts` change the dynamic `const { Agent } = await import('@mastra/core/agent');` to confirm v1; add `id: 'ai-agent-probe'` to the `new Agent({...})` call inside `probeApiKey`
- [x] 3.2 Run `pnpm --filter @resumind/api typecheck` and resolve any type errors
- [x] 3.3 Run `pnpm --filter @resumind/api test -- --run` and confirm all unit tests pass (in particular the `ai-agent.service.spec.ts` probe path)
- [x] 3.4 Re-verify the API-key probe: confirm `Invalid API key` returns 422 in `apps/api/src/ai-agent/ai-agent.service.spec.ts`

## 4. Re-implement `modelsDevGateway` against the v1 `MastraModelGateway` class

- [x] 4.1 In `packages/import-models/src/fetch-via-gateway.ts` remove the v0.20 `import { PROVIDER_REGISTRY, type ProviderConfig } from '@mastra/core';` and replace with `import { MastraModelGateway, type ProviderConfig } from '@mastra/core/llm';` (or the equivalent v1.38 re-export path verified during typecheck)
- [x] 4.2 Re-implement `modelsDevGateway.fetchProviders()` to construct the v1 built-in `ModelsDevGateway` (or the documented v1 equivalent) and delegate `fetchProviders()` to it, returning `Record<string, ProviderConfig>` in the same shape v0.20's `PROVIDER_REGISTRY` exposed
- [x] 4.3 Keep the local `MastraModelGateway` interface in `packages/import-models` as a structural sub-view (only the `fetchProviders()` method the workspace uses) so test stubs that return a hand-rolled `Record<string, ProviderConfig>` keep satisfying it without implementing the full v1 class
- [x] 4.4 Run `pnpm --filter @resumind/import-models typecheck` and `pnpm --filter @resumind/import-models test -- --run`; both must pass
- [x] 4.5 Run `pnpm --filter @resumind/api test -- --run` and confirm `ImportModelsCatalogService` unit tests (which inject a stub gateway via `setGateway()`) still pass against the v1 surface

## 5. Verify Vitest v4 and Jest v30 are compatible with the existing test files

- [x] 5.1 Read each `vitest.config.ts` (`apps/web/vitest.config.ts`, `apps/import-agent/vitest.config.ts`, `packages/import-models/vitest.config.ts`, `packages/types/vitest.config.ts`, `packages/resume-template/vitest.config.ts`); if any of them set `test.poolOptions.{forks,vmThreads}`, rewrite to the v4 top-level keys (`execArgv`, `isolate`, `maxWorkers`, `vmMemoryLimit`)
- [x] 5.2 Audit `*.spec.ts` / `*.test.ts` files in the five vitest packages for the third-argument `test('name', fn, { retry })` shape; rewrite any occurrences to the v4 second-argument `{ retry }` form
- [x] 5.3 Run `pnpm test -- --run` (root, runs the vitest unit suite via turbo) and confirm all packages pass
- [x] 5.4 Run `pnpm --filter @resumind/api test -- --run` and confirm the Jest v30 + `@types/jest@30` pair works with the existing `Test.createTestingModule` + `supertest` patterns in `apps/api/src/**.spec.ts`
- [x] 5.5 Confirm no spec file uses a Jest 29-only API that was removed in 30 (the only practical risk is if a spec calls a private `@jest/globals` internal; verify with `rg "@jest" apps/api/src` returns no hits)

## 6. Verify `marked@18` and `lucide-react@1` are compatible

- [x] 6.1 Confirm `packages/resume-template` continues to call `marked.parse(string)` / `marked.use(...)` against the v18 surface; the public API is preserved, no source diff expected
- [x] 6.2 Run `pnpm --filter @resumind/resume-template test -- --run` and confirm template unit tests pass
- [x] 6.3 Audit `apps/web/src/**/*.{ts,tsx}` for `lucide-react` icon imports; confirm every name we use is still exported in v1.17.0; if any are gone, swap to the documented v1 equivalent (or pin `lucide-react@^0.525.0` and file a follow-up)
- [x] 6.4 Run `pnpm --filter @resumind/web build` and confirm the Next.js 16.2.7 build succeeds

## 7. Documentation and configuration touch-ups

- [x] 7.1 In `apps/api/README.md` confirm the Mastra section still describes the v1 subpath imports (`@mastra/core/agent`, `@mastra/core/llm`); update the sentence that currently says "the same curated set is published as `PROVIDER_REGISTRY`" (in the inline JSDoc in `packages/import-models/src/fetch-via-gateway.ts`) to reflect the v1 `MastraModelGateway` / `ModelsDevGateway` class — this comment is also referenced by the existing `openspec/changes/archive/2026-06-03-mastra-model-gateway-catalog` proposal
- [x] 7.2 In `.env.example` for the API, no new env vars are introduced by this change; the `IMPORT_MODELS_CATALOG_SOURCE` knob stays
- [x] 7.3 No CI workflow file changes (`.github/workflows/*` are unaffected by these dependency bumps; verify with `git diff`)

## 8. Verification

- [x] 8.1 Run `pnpm --filter @resumind/api typecheck` and resolve all type errors
- [x] 8.2 Run `pnpm --filter @resumind/import-agent typecheck` and resolve all type errors
- [x] 8.3 Run `pnpm --filter @resumind/import-models typecheck` and resolve all type errors
- [x] 8.4 Run `pnpm --filter @resumind/types typecheck` and resolve all type errors
- [x] 8.5 Run `pnpm --filter @resumind/resume-template typecheck` and resolve all type errors
- [x] 8.6 Run `pnpm --filter @resumind/web typecheck` and resolve all type errors
- [x] 8.7 Run `pnpm format:check` and resolve any formatting drift
- [x] 8.8 Run `pnpm lint` (Biome) and resolve any lint errors
- [x] 8.9 Run `pnpm test -- --run` (root) and confirm all unit tests pass (vitest + jest)
- [x] 8.10 Run `pnpm build` and confirm the turbo build of all six packages succeeds
- [x] 8.11 Run `pnpm --filter @resumind/api test:e2e` against the local Supabase stack (per `openspec/specs/e2e-testing/spec.md`); confirm the model-catalog / gateway / API-key-probe scenarios pass; if a scenario fails on a renamed `ProviderConfig` field, update the `expect(...)` line in the same commit and amend the scenario description
- [x] 8.12 Open the change PR with the conventional commit title `chore(deps): upgrade @mastra/core to v1.38.0 and refresh outdated dependencies` and a body that links to the `pnpm outdated` baseline and the `@mastra/core@1.38.0` v1 migration guide

## E2E test impact

### Must pass unchanged

- `apps/api/test/e2e/local-supabase.e2e-spec.ts` — the AI-agent catalog / probe scenarios (`GET /import/llm/providers`, `GET /import/llm/providers/:providerId/models`, `PUT /import/llm/config` model validation, API-key probe). The v1 `MastraModelGateway` / `ModelsDevGateway` class returns the same `ProviderConfig` shape v0.20's `PROVIDER_REGISTRY` exposed, so the assertion shape does not change.

### Update required

- None expected. If a v1 `ProviderConfig` field is renamed in a way that breaks a `local-supabase.e2e-spec.ts` assertion, update the `expect(...)` line in the same commit and amend the scenario's `#### Scenario:` description to record the field rename (per the openspec rule "do not edit unrelated E2E specs to force green builds" — only edit the assertions the v1 migration actually affects).

### Add

- None. This change is dependency-only and adds no new user-facing behavior.
