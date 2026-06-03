## Context

The import model catalog in `packages/import-models` and the runtime service in `apps/api` previously fetched `https://models.dev/api.json` directly and built a Mastra-shaped catalog from the raw payload. Models not present in the `models.dev` runtime (e.g. a provider Mastra cannot resolve because it lacks an OpenAI-compatible URL, an installed package, or a configured `api` + `env`) were still surfaced in the UI and only failed at agent-run time.

`@mastra/core@0.20.2` ships a `MastraModelGateway` abstraction. Its built-in `ModelsDevGateway.fetchProviders()` returns the curated set Mastra can actually call. The class is **not part of the public exports** of `@mastra/core@0.20.2`, but the same curated set is published as `PROVIDER_REGISTRY` — a static `Record<string, ProviderConfig>` re-exported from `@mastra/core`. This is the only public surface in the pinned version that matches what `ModelsDevGateway.fetchProviders()` would return.

The two consumers (CLI sync script and runtime service) currently call `fetchModelsDevRegistry()` independently, with the runtime reading `MODELS_DEV_API_URL` from config so deployments can pin the URL. With the gateway, the URL is owned by the gateway and the override is no longer meaningful — providers the gateway does not accept should not be reachable via URL override.

## Goals / Non-Goals

**Goals:**

- Single source of truth for "which providers/models does Mastra support": Mastra's own provider registry (`PROVIDER_REGISTRY` from `@mastra/core`).
- The runtime service and the offline `catalog.json` go through the same discovery path, so they cannot drift.
- Keep the public surface (`ImportModelCatalog`, `getCatalog()`, `getStatus()`, `/import/llm/*` endpoints) unchanged.
- Add a `MastraModelGateway` injection point so tests can stub the gateway and so a future Netlify/custom gateway can be plugged in without touching the catalog builder.
- Drop the `MODELS_DEV_API_URL` config knob — the gateway owns the URL.

**Non-Goals:**

- Upgrading `@mastra/core` to a newer version (this works on the pinned `^0.20.2`).
- Rewriting the catalog builder (`buildImportModelCatalog`) — it still takes a `ModelsDevRegistry` shape; the gateway fetch produces a filtered `ModelsDevRegistry` so the builder is reused as-is.
- Changing the `/import/llm/*` API contract (request/response shapes, validation, key encryption).
- Adding Netlify or other gateway backends — only the contract is plumbed, the default impl is the public `PROVIDER_REGISTRY`.

## Decisions

### 1. Re-declare `MastraModelGateway` as a local interface

The user-facing example calls `new MastraModelGateway()`, but in `@mastra/core@0.20.2` the class is not publicly exported. Rather than reach into internal chunk paths (`@mastra/core/dist/chunk-...`), we declare a small typed interface in `packages/import-models` that mirrors the public surface of the real class (`name`, `prefix?`, `fetchProviders(): Promise<Record<string, ProviderConfig>>`).

- **Alternative considered:** import the real class via deep path (`@mastra/core/dist/llm/model/gateways/base.js`). Rejected: those subpaths are not in the package's `exports` map and would break the next minor bump. The interface is a small, stable contract.
- **Alternative considered:** call `new ModelsDevGateway()` directly. Rejected for the same reason — the class is internal. Defaulting to `PROVIDER_REGISTRY` gives the same data without the import risk.

### 2. Default `modelsDevGateway` proxies `PROVIDER_REGISTRY`

`PROVIDER_REGISTRY` is the static, publicly exported `Record<string, ProviderConfig>` from `@mastra/core`. It is the snapshot `ModelsDevGateway.fetchProviders()` produces. Returning it from a `MastraModelGateway`-shaped object's `fetchProviders()` keeps the contract uniform with future gateways (Netlify, custom) while avoiding any internal-import hazard.

### 3. Fetch model metadata from `models.dev` after the gateway call

`ProviderConfig` entries carry `models: string[]` (just IDs), not the model metadata (`modalities`, `tool_call`, `reasoning`) that the catalog builder needs for chat-capable filtering and PDF-import scoring. We keep one additional `fetch()` of `https://models.dev/api.json` to retrieve that metadata, then intersect it with the gateway-accepted provider IDs and model IDs.

- **Alternative considered:** drop the PDF-import scoring and the chat-capable filter, keep every model the gateway lists. Rejected: that loses the curated "recommended for PDF import" model and the embedding/TTS/whisper exclusion that the user-facing list relies on.
- **Alternative considered:** build a `ModelsDevRegistry` from `PROVIDER_REGISTRY` alone (using a stub `models: Record<string, Partial<ModelsDevModel>>` with empty metadata). Rejected: would break the builder's chat-capable and PDF-score heuristics and silently regress the recommended-model selection.

### 4. Override `env` with the gateway's `apiKeyEnvVar`

`ProviderConfig.apiKeyEnvVar` is `string | string[]`; the builder expects `string[]`. We normalize it and prefer the gateway value when present (so e.g. `VERCEL`'s `AI_GATEWAY_API_KEY` env var is used even if the raw models.dev payload has a different ordering). Falls back to the raw `env` array when the gateway exposes no value (covers edge cases where the gateway accepts a provider without a usable env var hint).

### 5. Remove the `MODELS_DEV_API_URL` config knob

With the gateway as the source of truth, the URL override loses meaning: a user-supplied URL cannot widen the set of providers Mastra supports. The override is removed from `.env.example`, the README, and the service config read.

- **Alternative considered:** keep the override and re-implement the filter locally when the override is set. Rejected: that re-opens the door to "catalog says provider X is supported but Mastra can't resolve X" — the very bug this change fixes.

### 6. Status `source` becomes `'mastra-gateway' | 'fallback'`

`ImportModelsCatalogStatus.source` was `'models.dev' | 'fallback'`. Renamed to `'mastra-gateway'` to reflect the new source of truth. The spec's "Startup with models.dev available" scenario is updated to "Startup with Mastra gateway available" while keeping the same observable behavior (catalog built from remote data, fall back to bundled on failure).

### 7. Keep `fetchModelsDevRegistry` as a deprecated alias

It still has at least one external-consumer-shaped caller pattern (the CLI script before this change, plus any third-party tool that imports `@resumind/import-models`). Marking it `@deprecated` and re-exporting it preserves source compatibility without keeping the gateway out of the runtime path.

## Risks / Trade-offs

- **[Risk] Provider set shrinks vs. the raw models.dev payload** — Mastra's registry only includes OpenAI-compatible providers with an installed package or a configured `api` + `env`. Some niche providers present in models.dev will disappear from the UI. **Mitigation:** this is the intended behavior (they weren't routable before); the change log / commit body documents the shrinkage. The catalog still includes the top providers (openai, anthropic, google, deepseek, groq, mistral, xai, openrouter, etc.).
- **[Risk] `@mastra/core` is now a direct dependency of `packages/import-models`** — it was previously only a transitive peer via `apps/import-agent` and `apps/api`. **Mitigation:** both consumers already pin `^0.20.2`, so pnpm dedupes to the same resolved version. If a future bump changes `PROVIDER_REGISTRY` shape, the typed `ProviderConfig` import will catch it at build time.
- **[Risk] A future Mastra version exports the real `MastraModelGateway` class** — our local interface could drift from the upstream class. **Mitigation:** the interface is intentionally narrow (`fetchProviders` only). The next time the upstream is upgraded, we can either (a) alias the upstream class as a structural match for the interface, or (b) replace the local interface with `import type { MastraModelGateway } from '@mastra/core'`.
- **[Trade-off] Two requests per refresh** — startup and the daily cron now do a `PROVIDER_REGISTRY` lookup (in-process, instant) plus a single `fetch()` of `models.dev/api.json`. The previous path was also one fetch. Net: same network cost, one in-process lookup.

## Migration Plan

- Deploy is a normal app restart; no schema or DB migration.
- Rollback: revert the commit; the runtime service falls back to the previous `fetchModelsDevRegistry` path. The regenerated `catalog.json` is smaller; the previous `catalog.json` is recoverable from git.
- The CLI script `pnpm import-models:sync` now writes a Mastra-aligned catalog — operators who relied on the larger raw set should re-read the docs note that the list is filtered to Mastra-supported providers.
