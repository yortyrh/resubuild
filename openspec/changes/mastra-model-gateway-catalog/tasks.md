## 1. Add @mastra/core as a direct dependency

- [x] 1.1 Add `@mastra/core` to `packages/import-models/package.json` `dependencies` so `PROVIDER_REGISTRY` and `ProviderConfig` can be imported from there directly
- [x] 1.2 Re-run `pnpm install` to refresh `pnpm-lock.yaml`

## 2. Implement the gateway-backed fetch module

- [x] 2.1 Create `packages/import-models/src/fetch-via-gateway.ts` exporting a `MastraModelGateway` interface, a default `modelsDevGateway` that proxies `@mastra/core`'s `PROVIDER_REGISTRY`, and a `fetchImportModelRegistryViaGateway({ gateway?, apiUrl?, fetchImpl? })` that intersects the gateway's accepted providers/models with a `models.dev/api.json` metadata fetch
- [x] 2.2 Normalize the gateway's `apiKeyEnvVar` (string or string[]) into a string array and use it for the provider's `env` field, falling back to the raw provider `env` when the gateway has no value
- [x] 2.3 Throw a descriptive error when the metadata fetch fails (network error or non-2xx response)
- [x] 2.4 Update `packages/import-models/src/fetch-models-dev.ts` to mark `fetchModelsDevRegistry` as `@deprecated` and re-export the `FetchFn` type from the new module
- [x] 2.5 Update `packages/import-models/src/index.ts` to re-export the new public surface (`MastraModelGateway`, `modelsDevGateway`, `fetchImportModelRegistryViaGateway`, `FetchImportModelRegistryOptions`, `FetchFn`)

## 3. Add unit tests for the gateway-backed fetch

- [x] 3.1 Add `packages/import-models/src/fetch-via-gateway.test.ts` covering: provider filtering (gateway-accepted providers that exist in metadata are included, others are not), model filtering per provider, env-var override from the gateway, fallback to raw `env` when gateway exposes nothing, custom `apiUrl`, network error and non-2xx response, and an empty gateway-accepted set

## 4. Switch the runtime service to the gateway-backed fetch

- [x] 4.1 Update `apps/api/src/import-models-catalog/import-models-catalog.service.ts` to call `fetchImportModelRegistryViaGateway` instead of `fetchModelsDevRegistry`, drop the `MODELS_DEV_API_URL` config read, and rename the status `source` to `'mastra-gateway' | 'fallback'`
- [x] 4.2 Add a private `gateway: MastraModelGateway = modelsDevGateway;` property and a `setGateway()` method on the service so tests can inject a stub gateway
- [x] 4.3 Update the service's `*happy*` and `*fallback*` tests in `apps/api/src/import-models-catalog/import-models-catalog.service.spec.ts` to inject a stub gateway via `setGateway()` and to assert `source === 'mastra-gateway'`

## 5. Update the offline sync script

- [x] 5.1 Update `scripts/sync-import-models.mjs` to use `fetchImportModelRegistryViaGateway` with the default `modelsDevGateway`, mirroring the runtime fetch path
- [x] 5.2 Regenerate `packages/import-models/catalog.json` via the updated script and confirm it shrinks to the Mastra-aligned set (41 providers, 399 models)

## 6. Update docs and env example

- [x] 6.1 Remove `MODELS_DEV_API_URL` from `apps/api/.env.example` and add a comment about the `IMPORT_MODELS_CATALOG_SOURCE` switch
- [x] 6.2 Update the "Import model catalog" section of `apps/api/README.md` to describe the gateway-backed approach and drop the `MODELS_DEV_API_URL` row from the env-var table

## 7. Verify the change

- [x] 7.1 `pnpm typecheck` — passes
- [x] 7.2 `pnpm test` (Vitest in `packages/import-models`, Jest in `apps/api`) — all tests pass, including the 7 new `fetch-via-gateway.test.ts` cases and the updated `import-models-catalog.service.spec.ts`
- [x] 7.3 `pnpm lint` (Biome) and `pnpm format` (Prettier) — clean

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — `import LLM config (local Supabase)` describe block: `GET /import/llm/providers` returns a non-empty provider catalog; `GET /import/llm/config` returns `configured: false` for the fixture user. The contract of these two endpoints is unchanged; only the curated list of providers behind them is smaller.

### Update required

- None

### Add

- None
