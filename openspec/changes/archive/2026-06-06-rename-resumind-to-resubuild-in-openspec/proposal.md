## Why

The product has been rebranded from "Resumind" to "Resubuild" (see `README.md` heading, `apps/api/README.md`, the `developer@resubuild.local` seed account, and the `RESUME_PARALLELISM` env var name), but the openspec documentation under `openspec/config.yaml` and `openspec/specs/*` still uses the old "Resumind" name and `@resumind/*` package scopes. This mismatch makes the spec source of truth disagree with the codebase, misleads future agents that read specs first, and keeps the legacy brand visible in published capability descriptions. A larger project-wide rename (monorepo `name`, package scopes, env vars, Supabase project id) is being handled separately; this change keeps a tight scope to the openspec documents only.

## What Changes

- Update `openspec/config.yaml` so the product name in the `context` block reads "Resubuild" instead of "Resumind".
- In every `openspec/specs/<capability>/spec.md`, replace "Resumind" with "Resubuild" in capability prose, scenario titles, and requirement descriptions.
- In every `openspec/specs/<capability>/spec.md`, replace the `@resumind/*` package scope references with `@resubuild/*` in requirements, scenarios, and examples.
- In every `openspec/changes/<change>/proposal.md`, `design.md`, and `tasks.md` (active and archived), apply the same two renames to the **capability prose only** — leaving scripts, file paths, identifiers, and code blocks that already ship under the old names untouched.
- In every `openspec/changes/<change>/specs/**/*.md` (delta specs), apply the same two renames in capability prose.
- No new capabilities, no removed capabilities, no API or runtime behavior change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `monorepo-and-toolchain`: purpose sentence currently says "how the Resumind repository is organized"; rename to "Resubuild".
- `web-application`: opening sentence currently says "how the Resumind frontend authenticates"; rename to "Resubuild".
- `e2e-testing`: purpose sentence currently says "how Resumind runs integration tests"; rename to "Resubuild".
- `api-dev-debug-surface`: prose references "Resumind NestJS API"; rename to "Resubuild".
- `mcp-server`: prose references "Resumind MCP server" / `@resumind/...` packages; rename to "Resubuild" / `@resubuild/...`.
- `cv-rest-api`: prose references "Resumind-internal row `id` fields"; rename to "Resubuild-internal". Package scope references such as `@resumind/types` rename to `@resubuild/types`.
- `cv-json-import`: prose references "Resumind meta"; rename to "Resubuild meta".
- `cv-json-export`: prose references "Resumind-internal fields"; rename to "Resubuild-internal".
- `cv-editor-ui`: package scope references such as `@resumind/types` rename to `@resubuild/types`.
- `cv-normalized-schema`: package scope references such as `@resumind/types` rename to `@resubuild/types`.
- `import-preview-ui`: package scope references such as `@resumind/resume-template` rename to `@resubuild/resume-template`.
- `cv-template-presentation`: any package scope references rename to `@resubuild/*`.
- `resume-schema-validation`: package scope references such as `@resumind/schemas` rename to `@resubuild/schemas`.

The capability requirements themselves are unchanged — only the brand name and package scope strings inside the prose are touched. No delta is needed for capabilities that do not mention "Resumind" or `@resumind/*` in their requirements.

## Impact

- `openspec/config.yaml` (1 line)
- 13 spec files under `openspec/specs/<capability>/spec.md` (word-level edits only)
- `openspec/changes/archive/*/proposal.md`, `design.md`, `tasks.md`, and `openspec/changes/archive/*/specs/**/*.md` (word-level edits only)
- Any active `openspec/changes/<name>/*` files (word-level edits only) — there are no active changes at the time of authoring, only `archive/`.
- No source code, no scripts, no `apps/*`, `packages/*`, `supabase/*`, `.github/*`, or `README.md` changes — the broader project-wide rename is out of scope here.
- No E2E test contract changes. No DB migration. No CI change.
