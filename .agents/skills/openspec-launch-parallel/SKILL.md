---
name: openspec-launch-parallel
description: Execute OpenSpec parallel plan — implement in worktrees, then auto-merge each change to main with verify, e2e, and fix loop between integrations. Use for /opsx-launch-parallel.
license: MIT
metadata:
  author: jsonresume-web
  version: '1.0'
---

# OpenSpec parallel launch (implement + auto-integrate)

Default behavior for `/opsx-launch-parallel`: run the plan, then **land every completed change on `main` before the next batch** — no manual `/opsx-parallel-integrate` step unless `--no-auto-integrate`.

## Workflow position

```
/opsx-plan-parallel
/opsx-launch-parallel          ← this skill (implement + merge loop)
/opsx-parallel-status
/opsx-parallel-cleanup
```

Manual single-change landing (same steps, one at a time outside launch): `/opsx-parallel-integrate`

## Phase 1 — Implement (per batch)

1. Load `.cursor/agents/state/parallel-plan.json`
2. Main repo clean; create worktrees via `.cursor/scripts/worktree-add.sh`
3. Spawn `opsx-change-implementer` subagents in parallel (max 6)
4. Wait for completion; collect `{ status, commits, errors }`

## Phase 2 — Auto-integrate loop (per completed change, batch order)

For each change with `status: completed`:

| Step | Action                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------- |
| 1    | Targeted tests in worktree (package-scoped; avoid jest coverage failure on partial runs)       |
| 2    | `git checkout main && git merge --no-ff opsx/<change>`                                         |
| 3    | `git worktree remove .worktrees/<change> --force`                                              |
| 4    | Rebase each remaining sibling worktree: `git -C .worktrees/<sibling> rebase main`              |
| 5    | `fnm use` / `nvm use`, then `pnpm verify`                                                      |
| 6    | If API/CV/import touched: `pnpm test:e2e`                                                      |
| 7    | Fix failures on `main`; commit; re-run verify until green                                      |
| 8    | Browser smoke when import agent, search API, or CV editor UX changed (Cursor browser has keys) |
| 9    | Append entry to `parallel-integration.json`                                                    |

Repeat until all completed changes in the batch are merged and their worktrees removed.

## Phase 3 — Next batch

When batch N is fully integrated, start batch N+1 without prompting (unless blocked).

## Verification checklist

```bash
# Node 22 from .nvmrc
fnm use   # or nvm use

pnpm verify          # format, lint, typecheck, unit tests, build
pnpm test:e2e        # when backend/CV/import paths changed
```

Common post-merge fixes:

- `pnpm format && pnpm lint:fix` then commit
- Incomplete test mocks (e.g. `ImportJsonPreview` shape)
- Import order (biome organize imports)

## Hard rules

- One change merged at a time within the loop
- Never auto-resolve merge/rebase conflicts
- Never push unless user asks
- Delete integrated worktree immediately after merge
- Rebase siblings before merging the next change in the same batch
- Do not skip verify after each merge

## Flags

| Flag                  | Effect                                                        |
| --------------------- | ------------------------------------------------------------- |
| `--no-auto-integrate` | Implement only; user runs `/opsx-parallel-integrate` manually |
| `--batch N`           | Single batch                                                  |
| `--dry-run`           | Print plan only                                               |

## When to use browser smoke

- Social profile discovery / import flows (needs Tavily + LLM in browser session)
- Work ↔ Volunteer move buttons and confirmation dialog
- CV section sort order after date edits
