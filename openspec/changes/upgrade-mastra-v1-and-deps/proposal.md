## Why

`@mastra/core` is pinned at `^0.20.2` across `apps/api`, `apps/import-agent`, and `packages/import-models` while v1 has been the current release line since January 2026. The monorepo's CV import + job-application agent workflows, the model router gateway catalog (`modelsDevGateway` / `PROVIDER_REGISTRY`), and the API-key probe path are stuck on a release that is now several majors behind. Sticking with 0.20.2 means we miss v1's new `MastraModelGateway` public class, the dedicated observability/tracing packages, the consolidated scorers API, the agent `id` requirement, and the new `createTool` `execute(inputData, context)` signature, and we will continue to accumulate upstream drift as the AI SDK v5/v6 surface keeps moving.

A `pnpm outdated` sweep across the workspace also surfaces several other outdated packages with their own breaking-change risk: `vitest@3` → `4`, `jest@29` → `30`, `marked@15` → `18`, `pdf-parse@1` → `2`, `zod@3` → `4`, `typescript@5` → `6`, `lucide-react@0.x` → `1.x`, `class-validator@0.14` → `0.15`, `@types/node@20/22` → `25`, and patch bumps for `react@19`, `next@16`, `@supabase/supabase-js`, `@tanstack/react-query`, and the `@nestjs/*` line. The user asked us to upgrade `@mastra/core` to the latest version and, via the Context7 MCP server, to also pick up the other outdated dependencies. This change lands both in one pass so we do not have to re-do the same migration work in two months.

The scope is deliberately "dependency upgrades + minimum required source changes" — no behavior changes, no spec-level requirement changes other than what the new Mastra contract forces (the `id` field on `Agent` and the model-router gateway export path), and no API surface changes for the web app or the REST/MCP layer.

## What Changes

- Upgrade `@mastra/core` from `^0.20.2` to `^1.38.0` (latest v1) in `apps/api`, `apps/import-agent`, and `packages/import-models`. Apply the v1 migration surface that touches our code:
  - Add the required `id` field to every `new Agent({...})` call (6 sites: `pdf-import.workflow.ts`, `website-import.workflow.ts`, `prepare-application.workflow.ts` × 2, `transcribe-image-resume.tool.ts`, `transcribe-pdf-with-vision.tool.ts`, `ai-agent.service.ts`).
  - Replace top-level `import { ... } from '@mastra/core'` with the v1 subpath imports (`@mastra/core/agent`, `@mastra/core/llm`).
  - Replace the public `PROVIDER_REGISTRY` import in `packages/import-models/src/fetch-via-gateway.ts` with the new `MastraModelGateway` public class (`@mastra/core/llm`); the bundled `modelsDevGateway` is re-implemented as a thin wrapper that calls `new ModelsDevGateway().fetchProviders()` (or the equivalent public surface documented for v1.38) so tests can still inject a stub gateway via `setGateway()`.
  - Remove any use of `agent.fetchMemory()` / `mastra.get*` plural getters (we have none today; verified by grep).
  - Keep `agent.generate(prompt, { structuredOutput: { schema, model? }, maxSteps? })` calls intact — that signature is still the v1 contract.
- Upgrade `vitest` from `^3.2.4` to `^4.1.8` and `@vitest/coverage-v8` to `^4.1.8` across all five workspace packages that use it. Apply the v4 migration surface: `poolOptions.{forks,vmThreads}` → top-level `execArgv` / `isolate` / `maxWorkers` / `vmMemoryLimit`; third-argument `test('name', fn, { retry })` → second-argument `{ retry }`. Colocated `*.spec.ts` / `*.test.ts` files keep their `vi.mock`, `vi.fn`, `describe`, `it` calls (v4-compatible). Update all `pnpm test` invocations to use `-- --run` per the workspace rule.
- Upgrade `jest` from `^29.7.0` to `^30.4.2` and `@types/jest` to `^30.0.0` in `apps/api` (unit + e2e). `jest --coverage`, `jest --config test/e2e/jest-e2e.config.cjs --runInBand`, and the `Test.createTestingModule` / `supertest` patterns from `apps/api/src/**.spec.ts` are v30-compatible.
- Upgrade `marked` from `^15.0.12` to `^18.0.4` in `packages/resume-template`. v18's `marked()` / `marked.parse()` / `marked.use()` API is the same shape we use; the only consumer (`packages/resume-template`) passes strings through `marked.parse`, so the source diff should be limited to the `package.json` bump plus type-checks.
- Upgrade `pdf-parse` from `^1.1.4` to `^2.4.5` in `apps/import-agent`. v2 ships a different default export shape (a callable function instead of a `{ default }` object) and updated TypeScript types; the call sites in `extract-pdf-text.tool.ts` will be updated to match.
- Upgrade `zod` from `^3.25.x` to `^4.4.3` in `apps/api`, `apps/import-agent`, and `apps/web`. v4 changes how `z.record` / `z.string` / `z.object` typing infers and renames some error helpers; the few call sites in `apps/api/src/mcp/tool-definitions.ts` and the import-agent Zod schemas (currently `z.object({ type: 'object' })`-style JSON Schema objects, not Zod schemas) are not affected. **Keep on `zod@3` if any direct `z.X` schema is found in app code — search before bumping.**
- Upgrade `typescript` from `^5.8.3` / `^5` to `^6.0.3` only if `pnpm typecheck` and `pnpm build` pass on the new major across all six packages; otherwise pin at the latest `5.9.x` and file a follow-up.
- Upgrade `lucide-react` from `^0.525.0` to `^1.17.0` in `apps/web`. The `import { Icon } from 'lucide-react'` API is preserved in v1; only the `package.json` and lockfile change.
- Upgrade `class-validator` from `^0.14.4` to `^0.15.1` in `apps/api`. v0.15 is a minor; existing decorators (`@IsString`, `@IsOptional`, `@ValidateNested`, etc.) used in DTOs are compatible.
- Upgrade `@types/node` from `^20` (web) / `^22.19.19` (api) to `^25.9.1`. Required to match the bumped `typescript@5.x`/Node engine.
- Apply the safe patch / minor bumps: `react`/`react-dom` `19.2.4` → `19.2.7`, `next` `16.2.6` → `16.2.7`, `@supabase/supabase-js` `2.106.x` → `2.107.x`, `@tanstack/react-query` / `…-devtools` `5.100.x` → `5.101.x`, `react-hook-form` `7.76.x` → `7.77.x`, `@nestjs/common|core|platform-express|testing` `11.1.23` → `11.1.24`. These are confirmed API-compatible via Context7.
- Keep `pnpm-lock.yaml` in sync via a single `pnpm install` and verify `pnpm verify` (format:check → biome → typecheck → test → build) is green before merging.

No new features, no API changes, no DB migrations, no spec-level requirement changes for end users. This is a dependency-upgrade + minimum-required-source-change change.

## Capabilities

### New Capabilities

_None._ The change is dependency-only. No new spec-level capability is introduced.

### Modified Capabilities

- `resume-import-agent`: The existing `new Agent({ name, instructions, model: { id, apiKey } })` shape used in `apps/import-agent` MUST add the v1-required `id` field, and the v1-only subpath import (`@mastra/core/agent`) replaces the legacy `@mastra/core` import. Tool signatures (the `createTool` factories inside `tools/*.tool.ts`) are not used in the current workflows (the import agent composes `Agent` + plain async functions, not `createTool`); the v1 `execute(inputData, context)` migration is therefore scoped to "if/when `createTool` is added in a future change", not in this one.
- `import-llm-config`: The default `modelsDevGateway` implementation in `packages/import-models/src/fetch-via-gateway.ts` MUST source its accepted provider/model set from the v1 public `MastraModelGateway` class (or its `ModelsDevGateway` shipped default) rather than the v0.20 `PROVIDER_REGISTRY` re-export. The `MastraModelGateway` injection contract (the `setGateway()` method on `ImportModelsCatalogService`, the `gateway` option on `fetchImportModelRegistryViaGateway`) and the spec scenarios that depend on the `MastraModelGateway` surface remain unchanged. `ProviderConfig` continues to be the v1 type re-exported from `@mastra/core/llm`.

## Impact

- `apps/api/package.json` — bump `@mastra/core` to `^1.38.0`; bump `@nestjs/*` to `^11.1.24`; bump `@supabase/supabase-js` to `^2.107.0`; bump `zod` to `^4.4.3` (only if all DTO schemas keep typing); bump `class-validator` to `^0.15.1`; bump `@types/jest` to `^30.0.0`; bump `@types/node` to `^25.9.1`; bump `jest` to `^30.4.2`; bump `typescript` to `^6.0.3` (or pin to `5.9.x` if v6 fails).
- `apps/import-agent/package.json` — bump `@mastra/core` to `^1.38.0`; bump `pdf-parse` to `^2.4.5`; bump `vitest` + `@vitest/coverage-v8` to `^4.1.8`; bump `zod` to `^4.4.3` (only if direct Zod use is present, else keep at `^3.25.x`).
- `packages/import-models/package.json` — bump `@mastra/core` to `^1.38.0`; bump `vitest` + `@vitest/coverage-v8` to `^4.1.8`.
- `packages/types/package.json` — bump `vitest` + `@vitest/coverage-v8` to `^4.1.8`.
- `packages/resume-template/package.json` — bump `marked` to `^18.0.4`; bump `vitest` + `@vitest/coverage-v8` to `^4.1.8`.
- `packages/schemas/package.json` — no change (pure data package).
- `apps/web/package.json` — bump `next` to `^16.2.7`; bump `react` / `react-dom` to `19.2.7`; bump `@tanstack/react-query` + devtools to `^5.101.0`; bump `react-hook-form` to `^7.77.0`; bump `lucide-react` to `^1.17.0`; bump `vitest` + `@vitest/coverage-v8` to `^4.1.8`; bump `@types/react` to `19.2.16`; bump `@types/node` to `^25.9.1`.
- Root `package.json` — no `dependencies` change; `packageManager` and engine stays at `pnpm@10.26.0` / Node 22.x.
- **Source files touched** (Mastra v1 surface only):
  - `apps/import-agent/src/workflows/pdf-import.workflow.ts` — add `id` to `new Agent({...})`, swap import to `@mastra/core/agent`.
  - `apps/import-agent/src/workflows/website-import.workflow.ts` — add `id` to `new Agent({...})` (2 sites), swap import.
  - `apps/import-agent/src/workflows/prepare-application.workflow.ts` — add `id` to `new Agent({...})` (2 sites), swap import.
  - `apps/import-agent/src/tools/transcribe-image-resume.tool.ts` — add `id`, swap import.
  - `apps/import-agent/src/tools/transcribe-pdf-with-vision.tool.ts` — add `id`, swap import.
  - `apps/api/src/ai-agent/ai-agent.service.ts` — add `id`, swap import to `@mastra/core/agent`.
  - `packages/import-models/src/fetch-via-gateway.ts` — replace `import { PROVIDER_REGISTRY, type ProviderConfig } from '@mastra/core'` with `import { MastraModelGateway, type ProviderConfig } from '@mastra/core/llm'` and re-implement `modelsDevGateway` against the new public class. `ProviderConfig` shape (`name`, `models`, `apiKeyEnvVar`, `gateway?`) is preserved.
- **Source files touched** (Vitest v4 surface, only if we hit a config call site):
  - `apps/import-agent/vitest.config.ts`, `apps/web/vitest.config.ts`, `packages/{import-models,types,resume-template}/vitest.config.ts` — rewrite `poolOptions.{forks,vmThreads}` into the v4 top-level keys if any of them currently set those options (we currently do not; verify before bumping).
  - All `*.spec.ts` files — audit for the third-arg `test('name', fn, { retry })` shape and rewrite to second-arg. (We use the v3-correct `test('name', { retry }, fn)` shape today; this should be a no-op.)
- **Source files touched** (pdf-parse v2 surface):
  - `apps/import-agent/src/tools/extract-pdf-text.tool.ts` — update the `pdf-parse` import to match the v2 default-export shape.
- **Lockfile**: one `pnpm install` to update `pnpm-lock.yaml`; no manual lockfile edits.
- **Tooling**: `lefthook.yml`, `biome.jsonc`, `turbo.json`, and the GitHub Actions CI workflows are unchanged.
- **Database / Supabase**: no migrations, no RLS changes.
- **E2E tests**: the existing `apps/api/test/e2e/local-supabase.e2e-spec.ts` scenarios that exercise the model catalog gateway (`GET /import/llm/providers`, `GET /import/llm/providers/:id/models`, `PUT /import/llm/config` model validation, API-key probe) MUST continue to pass unchanged in shape — only the underlying gateway implementation is swapped. No scenario changes required unless the `ModelsDevGateway` v1 public API breaks one of the response fields, in which case the corresponding `expect(...)` line is updated and the scenario description is amended in the same commit.
- **Security**: no new auth surface; the API-key probe path stays the same (it constructs an `Agent` in-process and calls `.generate('ping')`); the `withScopedApiKey` env-var scoping is unchanged.

## Out of scope

- Adding the new Mastra v1 observability/tracing packages (`@mastra/observability-*`) — these are optional in v1 and not used by Resumind today.
- Adopting the AI SDK v6 surface (`@mastra/ai-sdk` v6 helpers) — not used in Resumind today.
- Migrating any test or production code to `createTool` with the v1 `(inputData, context)` signature — the import agent does not use `createTool` today, and adding it is a separate change.
- Bumping `puppeteer`, `sharp`, `lefthook`, `turbo`, or the patched `@wysimark/react@3.0.20` — these are not flagged by `pnpm outdated` and are out of scope.
