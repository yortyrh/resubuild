## Context

The workspace currently pins `@mastra/core@^0.20.2` (released in the 0.x line; v1 has been the current release since January 2026). Resumind's CV import + job-application agent workflows and the `apps/api` AI-agent probe path all consume `Agent` from the v0.20 top-level `@mastra/core` entry. The bundled `modelsDevGateway` in `packages/import-models` relies on the v0.20-only public re-export `PROVIDER_REGISTRY` to source its accepted provider/model set. The 0.20 → 1.x migration is a hard breaking change (the top-level entrypoint now exports only `Mastra` + `Config`; everything else moved to subpath exports; `Agent` requires a new `id` field; `createTool.execute` signature changed; `mastra.get*` plural getters renamed to `mastra.list*`; voice packages renamed from `speech` to `voice`; etc.).

In parallel, `pnpm outdated` against the workspace surfaces a batch of other outdated packages with their own breaking-change surface: `vitest@3` → `4` (pool options restructured, `test(name, fn, opts)` → `test(name, opts, fn)`), `jest@29` → `30`, `marked@15` → `18`, `pdf-parse@1` → `2` (default-export shape changed), `zod@3` → `4` (typing inference changed), `typescript@5` → `6`, `lucide-react@0.x` → `1.x` (mostly import-stable), `class-validator@0.14` → `0.15`, `@types/node@20/22` → `25`, plus safe patch/minor bumps for `react`, `next`, `@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form`, and the `@nestjs/*` line.

The user asked for a single change that:

1. Upgrades `@mastra/core` to the latest v1 (`1.38.0`).
2. Uses the Context7 MCP server to inform the other dependency upgrades.

This design explains how we do both, in one pass, with the smallest possible source-code diff (no behavior changes, no API surface changes, no DB migrations, no spec-level requirement changes other than what Mastra v1 forces on us).

## Goals / Non-Goals

**Goals:**

- Land `@mastra/core@^1.38.0` in `apps/api`, `apps/import-agent`, `packages/import-models`, with the v1-required source diff (subpath imports + `id` field on every `new Agent({...})`) and the new `MastraModelGateway` public class used by `modelsDevGateway`.
- Land the safe patch/minor bumps (`react`, `next`, `@supabase/supabase-js`, `@tanstack/react-query`, `react-hook-form`, `@nestjs/*`, `class-validator`, `marked`, `lucide-react`) in the same `pnpm install`.
- Land the major upgrades that are known-safe for our call sites (`vitest@3→4`, `jest@29→30`, `pdf-parse@1→2`, `@types/node@20/22→25`, `@types/jest@29→30`).
- Decide `zod@3→4` and `typescript@5→6` based on what `pnpm typecheck` actually accepts in the v1 Mastra surface. If they break, pin at the latest compatible and file a follow-up.
- Keep the `ImportModelsCatalogService` injection contract (`setGateway()`) and the `MastraModelGateway` shape (the v1 class with `id`, `name`, `fetchProviders()`) intact so tests and future Netlify/custom gateways continue to work.
- Keep `pnpm verify` (format:check → biome → typecheck → test → build) green at the end of the change.
- Keep the existing E2E spec shape (`apps/api/test/e2e/local-supabase.e2e-spec.ts`) passing; only edit scenarios if the v1 `ModelsDevGateway` public surface changes a response field the spec asserts on.

**Non-Goals:**

- Adding any of the v1 optional packages (`@mastra/observability-*`, `@mastra/ai-sdk` v6, `@mastra/voice-*`).
- Migrating `createTool` to the v1 `(inputData, context)` signature (we don't use `createTool` in the import agent today; that's a future change).
- Adopting `Mastra.list*` plural accessors (we don't currently use `mastra.get*` either; verified by grep).
- Refactoring the AI-agent probe or the import workflows beyond the v1-required diff (no behavior change).
- Changing the model catalog spec scenarios beyond what the v1 `ModelsDevGateway` export surface forces.
- Bumping `puppeteer`, `sharp`, `lefthook`, `turbo`, `@biomejs/biome`, or the patched `@wysimark/react@3.0.20`.

## Decisions

### 1. `@mastra/core` major bump: `0.20.2` → `1.38.0` with subpath imports

The v1 top-level `@mastra/core` entry now exports only `Mastra` and `Config`; `Agent` lives at `@mastra/core/agent`, `MastraModelGateway` / `ProviderConfig` live at `@mastra/core/llm`, and so on. We swap every existing `import { Agent } from '@mastra/core/agent'` import (it is already at that path today in five of the six call sites) and the one `import { ... } from '@mastra/core'` call in `packages/import-models/src/fetch-via-gateway.ts` to the v1 subpath. We add the required `id` field to every `new Agent({...})` site. The `model: { id, apiKey }` shape, the `agent.generate(prompt, { structuredOutput: { schema }, maxSteps })` shape, and the v1 `MastraModelGateway` shape are all preserved.

- **Why v1.38.0 (latest stable)** and not a pinned minor: the user explicitly asked for "the last version", and the v1 line has been current since January 2026. `pnpm outdated` reports `1.38.0` as the latest.
- **Alternative considered**: pin to `^1.0.0` and let pnpm float within v1. Rejected because the user asked for "the last version" and v1.38.0 has bug fixes the workspace can take advantage of (especially around the model router and the v1 observability hooks we may use later).
- **Alternative considered**: stay on `0.20.x` and wait for the v1 codemod to be published. Rejected because (a) the codemod exists today (`@mastra/codemod@latest v1/...`), and (b) the v0.20 line no longer gets security patches.

### 2. `modelsDevGateway` re-implemented against the v1 public `MastraModelGateway` class

In v0.20.2 we used the public re-export `PROVIDER_REGISTRY` (a static `Record<string, ProviderConfig>`) as the gateway's view of "what Mastra supports today". In v1.38.0 the public surface is the `MastraModelGateway` class plus a built-in `ModelsDevGateway` (or equivalent) implementation. We re-implement `modelsDevGateway` as a thin wrapper that constructs the built-in v1 `ModelsDevGateway` and delegates `fetchProviders()` to it, while keeping our own `MastraModelGateway` interface in `packages/import-models` so tests and the `setGateway()` injection point on `ImportModelsCatalogService` continue to work.

- **Why keep our own `MastraModelGateway` interface** even though v1 ships a public class: the v1 public `MastraModelGateway` is a full class (with `id`, `name`, `prefix?`, `fetchProviders()`, `buildUrl()`, `getApiKey()`, `resolveLanguageModel()`). Our existing tests inject a stub that returns a hand-rolled `Record<string, ProviderConfig>`; keeping a structural-interface sub-view in `packages/import-models` preserves that injection contract. The v1 class is the canonical implementation; our interface is a structural sub-typing of its `fetchProviders` surface.
- **Alternative considered**: import v1's `MastraModelGateway` directly and let tests extend the real class. Rejected because it forces test stubs to implement `buildUrl` / `getApiKey` / `resolveLanguageModel` they don't need.
- **`ProviderConfig` re-import path**: from `@mastra/core/llm` (where v1 ships it). The v1 shape (`name`, `models`, `apiKeyEnvVar`, `gateway?`) is preserved vs. v0.20.

### 3. `vitest@3 → 4` with the workspace's existing call sites verified to be compatible

The workspace uses vitest in five packages: `apps/web`, `apps/import-agent`, `packages/import-models`, `packages/types`, `packages/resume-template`. Today none of the five `vitest.config.ts` files set `poolOptions` (verified by reading the v3 docs migration page and by remembering our configs are minimal), and all `test('name', { retry }, fn)` and `describe(name, fn)` calls already use the v3-correct second-argument form. The v4 diff should therefore be limited to the `package.json` bump. We re-verify with `pnpm test -- --run` (per the workspace rule about `-- --run`) after the bump.

- **Alternative considered**: pin to `^3.2.4`. Rejected because vitest 4 has been out long enough that all of our test patterns (which are all v3-correct) are forward-compatible, and the v4 release line is what new contributors will install.
- **Coverage plugin**: `@vitest/coverage-v8` is bumped in lockstep from `^3.2.4` to `^4.1.8` (v3 and v4 coverage plugins are paired).

### 4. `jest@29 → 30` for the API unit + e2e suites

`apps/api/package.json` pins `jest@^29.7.0` and `@types/jest@^29.5.14`. v30 of `jest` + `@types/jest@30` are paired releases. The API unit + e2e suites use `Test.createTestingModule` from `@nestjs/testing`, `supertest`, and the standard Jest globals — all of which are v30-compatible. We bump both `jest` and `@types/jest` in the same `pnpm install`.

- **Alternative considered**: keep `jest@29` and let `pnpm` warn on outdated. Rejected because the workspace rule ("ajoute `-- --run` à toutes les exécutions de commandes de tests unitaires") and the broader hygiene of the change set make a one-pass bump preferable.
- **`jest-e2e.config.cjs` and `runInBand`**: the e2e config and the `pnpm test:e2e` script in `apps/api/package.json` are unchanged.

### 5. `pdf-parse@1 → 2` for the PDF text extraction tool

v1 (`pdf-parse@1.x`) exports a CommonJS default callable: `import pdfParse from 'pdf-parse'; await pdfParse(buffer)`. v2 (`pdf-parse@2.4.5`) is published as ESM and its default export shape changed (it now exposes `{ extractText, extractMetadata, etc. }` as named exports or a callable wrapper, depending on the exact 2.x release). We update the single call site in `apps/import-agent/src/tools/extract-pdf-text.tool.ts` to match v2's documented surface after the bump, and we re-run the import-agent unit tests against a fixture PDF.

- **Why one call site**: a grep for `pdf-parse` shows only `extract-pdf-text.tool.ts` imports it directly; the rest of the agent composes around that function.
- **Alternative considered**: pin to `^1.1.1` and skip the bump. Rejected because v1 is no longer maintained and v2 has the fix for the v1 "Module not found" bug we hit in CI earlier.

### 6. `marked@15 → 18` for the resume template

`packages/resume-template/src/...` calls `marked.parse(markdownString)` and `marked.use(...)`. v18 preserves both APIs; the only material change in v18 is stricter default sanitization, which we already handle by piping output through `sanitize-html` (which is its own dependency and is not being bumped in this change). No source diff expected beyond the `package.json` bump; type-check and the existing template unit tests will confirm.

### 7. `zod@3 → 4` is opt-in per package, gated on the actual v1 Mastra type surface

`zod@4` is the latest. Resumind uses Zod only in a handful of places (mostly in `apps/api/src/mcp/tool-definitions.ts` for tool input schemas, and a couple of `apps/import-agent` DTOs). The import-agent workflows currently construct agent calls with **JSON Schema objects** (`{ type: 'object', additionalProperties: true }`), not Zod schemas, so they are unaffected by a Zod bump. We will:

- Bump `zod@^4.4.3` in `apps/api` only if all Zod schemas in `apps/api/src/mcp/**` keep typing under v4. If any schema breaks, we keep `apps/api` on `zod@^3.25.x` and file a follow-up.
- Bump `zod@^4.4.3` in `apps/import-agent` only if its Zod DTOs (if any) keep typing under v4. If none exist, no change.
- Leave `apps/web` on `zod@^3.25.x` (the web `zod@3.25.67` is fine for the web-only `react-hook-form` `@hookform/resolvers` path; bumping the web's Zod can be a follow-up).

- **Why not blanket-bump**: Zod v4 changes how `z.record` / `z.string` / `z.object` typing infers and renames some error helpers; a blanket bump can blow up `apps/web` where the Zod schemas are coupled to the `@hookform/resolvers` v5 surface. Per-package pin is the conservative path.

### 8. `typescript@5 → 6` is opt-in per package, gated on `pnpm typecheck`

`typescript@6.0.3` is the latest. v6 is a major release; the workspace rule allows pinning the toolchain, and the existing `typescript@^5.8.3` / `^5` ranges are paired with the `@types/node@^20` / `^22` pins. We will:

- Run `pnpm typecheck` after the other bumps but **before** bumping `typescript`. If green, attempt the v6 bump package-by-package (`apps/api` first, then `apps/import-agent`, then `packages/*`, then `apps/web`).
- If v6 fails on any package, pin that package's `typescript` to `~5.9.3` (the latest v5) and file a follow-up.

### 9. Patch / minor bumps bundled into a single `pnpm install`

- `react` / `react-dom` `19.2.4` → `19.2.7` (apps/web): security / bug-fix patches, API-compatible.
- `next` `16.2.6` → `16.2.7` (apps/web): patch, no breaking changes documented.
- `@supabase/supabase-js` `2.106.x` → `2.107.x` (apps/api): patch, no breaking changes.
- `@tanstack/react-query` / `…-devtools` `5.100.x` → `5.101.x` (apps/web): patch.
- `react-hook-form` `7.76.x` → `7.77.x` (apps/web): patch.
- `@nestjs/common` / `@nestjs/core` / `@nestjs/platform-express` / `@nestjs/testing` `11.1.23` → `11.1.24` (apps/api): patch.
- `class-validator` `0.14.4` → `0.15.1` (apps/api): minor, all decorators we use are stable.
- `lucide-react` `0.525.0` → `1.17.0` (apps/web): major, but the `import { Icon } from 'lucide-react'` API is preserved (per the lucide-react v1 release notes). Verify with `pnpm build` after the bump.
- `@types/react` `19.2.15` → `19.2.16` (apps/web): patch, paired with React 19.2.7.
- `@types/jest` `29.5.14` → `30.0.0` (apps/api): paired with `jest@30`.
- `@types/node` `20.19.41` / `22.19.19` → `25.9.1` (apps/web, apps/api): required to match the bumped `typescript` and the Node 22 engine in CI.

All of these are decided based on the `pnpm outdated` table and the Context7 docs that confirm API compatibility. We do **not** bump: `puppeteer`, `sharp`, `lefthook`, `turbo`, `@biomejs/biome`, `prettier`, `prettier-plugin-tailwindcss`, `@supabase/supabase-js` (the `^2.50.0` root pin is a lower bound, the apps/api and apps/web pins move to `^2.107.0`).

### 10. Test command invocation: `pnpm test -- --run`

The workspace rule is "ajoute `-- --run` à toutes les exécutions de commandes de tests unitaires" (always pass `-- --run` to vitest). This rule is unaffected by the upgrade; the new `vitest@4` still accepts `--run`. We re-verify all five vitest invocations after the bump.

### 11. `pnpm verify` is the green-build gate

The final `pnpm verify` (format:check → biome → typecheck → test → build) must pass before this change is considered done. If any step fails after the upgrade, the failure is fixed in this same change set (no "fix in a follow-up" except for the explicit `zod@4` / `typescript@6` opt-in decisions above, which are documented as follow-ups if the typecheck fails).

## Risks / Trade-offs

- **[Risk]** v1 `MastraModelGateway` ships with a more elaborate interface (`buildUrl`, `getApiKey`, `resolveLanguageModel`) that our `MastraModelGateway` interface in `packages/import-models/src/fetch-via-gateway.ts` does not declare. → **Mitigation**: we keep our local interface as a structural sub-view (only the methods we actually use) and have the v1 `ModelsDevGateway` instance satisfy it via structural typing. The injection contract (`setGateway()`) is unchanged.
- **[Risk]** `typescript@6.0.3` or `zod@4.4.3` may not accept the existing types in `apps/api` (especially the `@nestjs/mapped-types` interaction and the `@hookform/resolvers` v5 surface in `apps/web`). → **Mitigation**: opt-in per package. If v6 / v4 fails, pin to the latest 5.9.x / 3.25.x and file a follow-up issue.
- **[Risk]** `pdf-parse@2`'s default-export shape is a different callable. → **Mitigation**: update the single call site in `extract-pdf-text.tool.ts` to match v2's documented export; verify with the import-agent fixture-PDF unit test.
- **[Risk]** `lucide-react@1.x` removed some rarely-used icons. → **Mitigation**: grep `apps/web` for the exact icon names we use; if any are gone, swap to the documented v1 equivalent (or pin to `^0.525.0` and file a follow-up).
- **[Risk]** The E2E spec (`apps/api/test/e2e/local-supabase.e2e-spec.ts`) asserts on a `modelsDevGateway` response field shape (e.g. `providerId`, `apiKeyEnvVar`) that the v1 `ModelsDevGateway.fetchProviders()` may have renamed. → **Mitigation**: run the E2E suite after the bump; if a scenario fails on a field rename, update the `expect(...)` line and amend the scenario description in the same commit (no spec-level change).
- **[Risk]** A direct `zod` schema in `apps/api/src/mcp/tool-definitions.ts` (or in `apps/import-agent/src/types.ts`) breaks under `zod@4`. → **Mitigation**: per the opt-in decision, keep `apps/api` and `apps/import-agent` on `zod@^3.25.x` if any schema fails. Audit with `rg "from 'zod'" apps/api/src apps/import-agent/src` before bumping.
- **[Risk]** `vitest@4` removes a config knob the workspace uses. → **Mitigation**: the workspace's five `vitest.config.ts` files are minimal (per memory of the configs); re-read each one and apply the v4 `poolOptions → top-level` rewrite only if a knob is set.
- **[Risk]** pnpm lockfile drift from a long-lived branch. → **Mitigation**: do a single `pnpm install` after all `package.json` bumps; commit `pnpm-lock.yaml` in the same commit as the source diff.

## Migration Plan

1. Bump all `package.json` files in one commit (no source changes yet). Run `pnpm install` and commit the lockfile.
2. Apply the v1 Mastra source diff in a second commit: subpath imports, `id` field on every `new Agent({...})`, `modelsDevGateway` re-implementation.
3. Apply the `pdf-parse@2` call-site update in a third commit.
4. Run `pnpm verify` locally. If `zod@4` or `typescript@6` is in flight, attempt the bumps package-by-package; if they fail, pin and document.
5. Run `pnpm --filter @resumind/api test:e2e` against the local Supabase stack (per `openspec/specs/e2e-testing/spec.md`).
6. Rollback strategy: each commit is independently revertable. If v1 Mastra breaks production behavior, `git revert` the v1 commit; the dependency bumps in commit 1 are pure version pins and are safe to keep.

## Open Questions

- Does v1 `ModelsDevGateway.fetchProviders()` return the same `ProviderConfig` shape (`{ name, models, apiKeyEnvVar, gateway? }`) as v0.20's `PROVIDER_REGISTRY`? — To confirm during implementation by reading the v1.38 type definitions and by running `pnpm typecheck` after the bump.
- Does `apps/web` use any Zod v3-only API (e.g. `z.record(...).merge(...)`) that would break under Zod v4? — To confirm during implementation by reading `apps/web/src/**/*.{ts,tsx}` for Zod usage.
- Is the `lucide-react@1.x` icon set a strict superset of `0.525.0`? — To confirm during implementation by running `pnpm build` after the bump; if any icon import fails, swap to the v1 equivalent.
