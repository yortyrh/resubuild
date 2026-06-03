## Why

The import model catalog (PDF import LLM picker) is built by directly fetching the raw `models.dev` registry at API startup, then filtering chat-capable models in-process. That bypasses Mastra's own notion of which providers and models the runtime can actually call. Two consequences:

1. The catalog exposes providers that Mastra cannot resolve (e.g. providers without an OpenAI-compatible URL, an installed package, or a configured `api` + `env`). Saving one of them makes PDF import fail at agent-run time.
2. The CLI sync script (`pnpm import-models:sync`) and the runtime service drift independently: nothing guarantees the offline `catalog.json` and the runtime in-memory catalog are built from the same source.

This change routes both paths through Mastra's `MastraModelGateway` so Mastra's own provider curation is the single source of truth for "supported providers/models", and the env-var override (`MODELS_DEV_API_URL`) is removed because the gateway is responsible for the upstream URL.

## What Changes

- Add a `MastraModelGateway` interface and a default `modelsDevGateway` implementation in `packages/import-models` that proxies `@mastra/core`'s public `PROVIDER_REGISTRY` (the curated snapshot `ModelsDevGateway.fetchProviders()` produces).
- Add `fetchImportModelRegistryViaGateway({ gateway, apiUrl?, fetchImpl? })` that asks the gateway which providers/models it supports, fetches model metadata from `https://models.dev/api.json`, and intersects them — keeping only providers/models the gateway accepts, and overriding each provider's `env` array with the gateway's `apiKeyEnvVar` when present.
- Switch the runtime catalog refresh (`ImportModelsCatalogService`) to call the new function. The `source` field on `ImportModelsCatalogStatus` becomes `'mastra-gateway' | 'fallback'` (was `'models.dev' | 'fallback'`). The `MODELS_DEV_API_URL` config read is removed; the gateway hard-pins the upstream URL.
- Switch the offline sync script (`scripts/sync-import-models.mjs`) to the same function, so the regenerated `catalog.json` reflects the same gateway-filtered set.
- Mark `fetchModelsDevRegistry` as `@deprecated` and keep it as a thin alias for backward compatibility with external consumers; remove `MODELS_DEV_API_URL` from `apps/api/.env.example` and `apps/api/README.md`.
- Regenerate `packages/import-models/catalog.json` via the updated sync script (41 providers, 399 chat-capable models — down from the previous larger raw set because the gateway drops providers Mastra cannot resolve).
- Add unit tests for the new module (7 cases covering provider/model filtering, env override, error handling, and a custom URL).

No breaking change for end users: the same `/import/llm/providers` and `/import/llm/providers/:id/models` endpoints return the same shape, just a smaller, Mastra-aligned list.

## Capabilities

### New Capabilities

None. The provider-discovery implementation is an internal refactor; the public contract (`ImportModelCatalog` shape, `/import/llm/*` endpoints) is unchanged.

### Modified Capabilities

- `import-llm-config`: the "The import LLM model catalog SHALL be refreshable from models.dev" requirement is tightened so the catalog is built from the Mastra gateway's accepted provider/model set, not the raw models.dev payload.

## Impact

- `packages/import-models` — new `fetch-via-gateway.ts` module + tests, `fetch-models-dev.ts` marked deprecated, `@mastra/core` promoted from a transitive peer to a direct dependency.
- `apps/api/src/import-models-catalog/import-models-catalog.service.ts` — uses the gateway-backed fetch; `setGateway()` injection hook for tests; status `source` value updated.
- `scripts/sync-import-models.mjs` — uses the gateway-backed fetch.
- `apps/api/.env.example`, `apps/api/README.md` — drop `MODELS_DEV_API_URL`, point docs at the gateway.
- `packages/import-models/catalog.json` — regenerated, smaller (Mastra's registry drops providers the runtime can't resolve).
- `pnpm-lock.yaml` — `@mastra/core` resolved into `packages/import-models`.
