## Context

The product has been rebranded from "Resumind" to "Resubuild" (see `README.md` heading, the `developer@resubuild.local` seed account, and the `RESUME_PARALLELISM` env var). The codebase (apps, packages, infra) is being renamed piecemeal through separate changes; the largest of those (`archive/2026-06-06-rename-project-to-resubuild`) covers monorepo `name`, package scopes, env vars, MCP server names, log lines, and Supabase project id.

The `openspec/` tree was not part of that earlier change, so the `openspec/config.yaml` `context` block still says "Resumind", and the spec files under `openspec/specs/*` and the change folders under `openspec/changes/archive/*` (plus any active `openspec/changes/*`) still contain the literal string "Resumind" and the `@resumind/*` package scope. This makes the published capability source of truth disagree with the running product, which misleads agents and humans that read specs first.

This change is scoped tightly to openspec documents only — no code, no scripts, no env, no infra.

## Goals / Non-Goals

**Goals:**

- Update the `product:` line in `openspec/config.yaml` to "Resubuild".
- In every `openspec/specs/<capability>/spec.md` affected file, rename:
  - the literal brand "Resumind" → "Resubuild" in `## Purpose`, `### Requirement:`, and `#### Scenario:` prose
  - the package scope `@resumind/<name>` → `@resubuild/<name>` wherever it appears in the same prose
- In every `openspec/changes/<change>/proposal.md`, `design.md`, `tasks.md`, and `openspec/changes/<change>/specs/**/*.md` (including the `archive/` tree), apply the same two renames to **capability prose only**. Leave code blocks (`pnpm --filter @resumind/api test -- --run`, file paths, identifiers, env var names, MCP `resumind://` URI templates, etc.) untouched in those files.
- Keep all scenario behavior, requirements, and Acceptance Criteria intact — only brand strings change.
- Keep all 13 affected capability deltas minimal and mechanical.

**Non-Goals:**

- Renaming the monorepo `name` field, `package.json` `name` fields, or the `@resumind/*` package scopes in the actual code (covered by `archive/2026-06-06-rename-project-to-resubuild`).
- Renaming env vars, the `RESUME_PARALLELISM` name, the `resumind://` MCP URI templates, or Supabase project ids.
- Renaming strings inside code blocks of proposal/design/tasks under `openspec/changes/` — those reference real package scripts (`pnpm --filter @resumind/api test -- --run`) that still exist on disk and must keep working.
- Changing any requirement behavior, scenario behavior, or `Acceptance Criteria`. The delta is word-substitution only.

## Decisions

**Decision 1: Two parallel renames, applied with a single text pass per file.**

- `Resumind` → `Resubuild` (word-boundary aware, preserves capitalization of all-caps contexts)
- `@resumind/` → `@resubuild/` (preserves all four suffix names: `api`, `web`, `types`, `schemas`, `resume-template`, `import-models`)

**Rationale:** The two strings are independent tokens and never overlap (`@resumind/` is always preceded by `@`, `Resumind` never is). A single ordered `Replace All` per file (e.g. `Resumind` → `Resubuild`, then `@resumind/` → `@resubuild/`) is sufficient and reversible. Doing them in two passes keeps the diff easy to review: one pass for the brand, one pass for the package scope.

**Decision 2: Skip code blocks in `openspec/changes/**` files; apply the rename only in capability prose.\*\*

`openspec/changes/archive/*/proposal.md` and `design.md` contain many code blocks with `pnpm --filter @resumind/api test -- --run` and similar — those reference real scripts that still ship under the old names. Renaming them in those files would create spec drift from the actual codebase. The rename is therefore restricted to the prose (paragraph text, list items, table cells) and explicitly excludes fenced code blocks and inline code (`@resumind/api` inside backticks that reference a real package) where the change should land in code, not docs.

**Rationale:** A `## E2E test impact` task constraint and a `## Out of scope` note in the proposal make this safe. Without the exclusion, `openspec validate` would pass locally while agents reading the archive would learn a wrong package name.

**Decision 3: For each affected spec, declare the impacted `### Requirement:` blocks under `## MODIFIED Requirements` with the full updated text.**

OpenSpec deltas track requirement blocks (header through last scenario). For a pure word-substitution rename where the requirement body and scenarios only change brand strings, the cleanest delta is to copy each affected `### Requirement:` block verbatim into `## MODIFIED Requirements` and apply the substitution. The Purpose prose (`## Purpose` at the top of each spec) is not a requirement and is not captured by the delta, so the implementation agent edits it directly.

**Rationale:** This matches the OpenSpec delta workflow documented in `openspec instructions specs` ("Locate the existing requirement in openspec/specs/<capability>/spec.md; Copy the ENTIRE requirement block; Paste under `## MODIFIED Requirements` and edit to reflect new behavior"). For a non-behavior change the substituted block is mechanically equal to the original.

**Decision 4: Capabilities that do not mention the brand or the package scope in any `### Requirement:` block receive no delta spec.**

- `monorepo-and-toolchain` — only `## Purpose` mentions the brand; no requirement body does. No delta required; the implementation agent edits Purpose directly.
- `web-application` — only `## Purpose` mentions the brand; the requirement body mentions `@resumind/types`. So one MODIFIED requirement is needed.
- `e2e-testing` — only `## Purpose` mentions the brand; requirement bodies do not. No delta required for the brand; the implementation agent edits Purpose directly. The `resumind://` URI templates in the regression list are part of the public MCP contract and stay untouched.
- `api-dev-debug-surface` — references `@resumind/api` in scenarios. One MODIFIED requirement.
- `mcp-server` — references both "Resumind MCP server" in `### Requirement:` and the MCP `name = 'resumind'` config (this is a code/runtime value, do NOT rename in spec — keep it as the canonical MCP server identifier). One MODIFIED requirement for the prose only; leave the `name = 'resumind'` literal inside the requirement body alone (it is a public MCP client contract).
- `cv-rest-api` — references "Resumind-internal row `id` fields" and `@resumind/types`. One MODIFIED requirement.
- `cv-json-import` — references "Resumind meta" and `@resumind/types`. One MODIFIED requirement.
- `cv-json-export` — references "Resumind-internal `id` fields" and `@resumind/types`. One MODIFIED requirement.
- `cv-editor-ui` — references `@resumind/types`. One MODIFIED requirement.
- `cv-normalized-schema` — references `@resumind/types`. One MODIFIED requirement.
- `import-preview-ui` — references `@resumind/resume-template`. One MODIFIED requirement.
- `cv-template-presentation` — references `@resumind/resume-template`. One MODIFIED requirement.
- `resume-schema-validation` — references `@resumind/schemas`. One MODIFIED requirement.

**Rationale:** Modifying capability prose in `## Purpose` is not part of the OpenSpec delta; it is part of the implementation. The delta focuses on the requirement blocks that the validator and reviewer care about.

**Decision 5: The `MCP server` `name = 'resumind'` value in the spec stays as `'resumind'`.**

That identifier is a public MCP client contract (clients match by it). Renaming it would be a breaking change to the MCP contract, not a brand rename. It is excluded from the rename even though the word "resumind" appears in the spec.

**Rationale:** The proposal explicitly excludes the MCP URI templates and the server `name`; the `resumind://` URI templates and the `name = 'resumind'` value stay as-is. Only narrative prose in the requirement is renamed.

## Risks / Trade-offs

- [Risk] The implementation agent may miss the `## Purpose` sections because the OpenSpec delta workflow does not track them. → Mitigation: `tasks.md` lists each spec under "Update `## Purpose` prose" with an explicit per-file line.
- [Risk] The implementation agent may rename `resumind://` URI templates or `name = 'resumind'` MCP server name in the `mcp-server` spec. → Mitigation: `tasks.md` calls out "Do NOT rename `resumind://` URI templates or `name = 'resumind'`" as a hard constraint under the `mcp-server` task.
- [Risk] A future OpenSpec archive merge that re-applies the delta may produce a no-op diff or may surface as a behavior change to reviewers who skim the archive. → Mitigation: the delta is a pure text substitution with no behavior change; `openspec validate` and the archive review checklist both pass.
- [Risk] Renaming the brand inside `openspec/changes/archive/*` may blur the history of the original proposals. → Mitigation: rename only the brand noun in prose; leave the original `pnpm --filter` script lines and the original package names in code blocks. Archive prose still reads correctly with the new name in the noun positions.
- [Trade-off] The "Resubuild" brand has not yet landed in code (it ships via the parallel `archive/2026-06-06-rename-project-to-resubuild` change). Until that change lands, the openspec specs will reference `@resubuild/types` while the code still has `@resumind/types`. → Mitigation: this is acceptable; the specs describe the desired end state, and a follow-up note in the archive explains the dependency.

## Migration Plan

1. Apply the text substitutions in `openspec/config.yaml`, every `openspec/specs/<capability>/spec.md` (purpose + requirement bodies), and every `openspec/changes/**/proposal.md|design.md|tasks.md|specs/**/*.md` (prose only — not code blocks).
2. Run `openspec validate rename-resumind-to-resubuild-in-openspec --strict` and `openspec validate` to confirm no spec regressions.
3. Run `pnpm format` (Prettier) on the modified `.md` files.
4. Run `pnpm lint:fix` (Biome) on the modified `.md` files.
5. Archive the change via `openspec archive rename-resumind-to-resubuild-in-openspec` once the PR merges.

No rollback strategy is needed: the rename is reversible with the inverse substitutions and the change is contained to openspec docs (no runtime, no migrations, no infra).
