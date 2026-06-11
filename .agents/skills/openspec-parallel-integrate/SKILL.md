---
name: openspec-parallel-integrate
description: Integrate one completed OpenSpec parallel change into main (merge + rebase siblings) or open a documented PR with mermaid diagrams. Use after /opsx-launch-parallel when changes are ready to land.
license: MIT
compatibility: Requires git worktrees, gh CLI for PR mode, openspec parallel plan optional.
metadata:
  author: jsonresume-web
  version: '1.0'
---

Integrate one finished parallel OpenSpec change. Two modes:

| Mode      | When                        | Outcome                                                              |
| --------- | --------------------------- | -------------------------------------------------------------------- |
| **merge** | Land locally, keep velocity | `--no-ff` merge to `main`, rebase other `.worktrees/*` onto `main`   |
| **pr**    | Review / CI before merge    | Push `opsx/<change>`, `gh pr create` with summary + mermaid diagrams |

**Trigger:** `/opsx-parallel-integrate`, or user asks to merge/rebase parallel worktrees or open PR for an OpenSpec change.

## Workflow position

```
/opsx-plan-parallel
/opsx-launch-parallel      ← default: runs this skill's merge loop automatically after each batch
/opsx-parallel-status
/opsx-parallel-integrate   ← this skill (manual single-change landing, or --no-auto-integrate)
/opsx-parallel-cleanup
```

When `/opsx-launch-parallel` runs without `--no-auto-integrate`, it executes the **Merge mode checklist** below for every completed change before the next batch. This skill remains for one-off integration, PR mode, or `--rebase-only`.

## Select change

1. Prefer `--change <name>` or `--next` (first completed change in plan order not yet in `parallel-integration.json`).
2. Verify in worktree: clean tree, all tasks `[x]`, commit ahead of `main`.
3. Ask merge vs PR if mode not specified.

## Merge mode checklist

1. Main repo clean, on `main`
2. Run verify in worktree before merge
3. `git merge --no-ff opsx/<change>` on `main`
4. `pnpm verify` on `main`
5. For each other `.worktrees/<sibling>`: `git rebase main` (stop on conflict)
6. `pnpm install` in rebased worktrees if lockfile changed
7. Append result to `.cursor/agents/state/parallel-integration.json`

## PR mode — body template

Sections for `gh pr create --body` (in order):

1. **Summary** — bullets from proposal Why / What Changes
2. **OpenSpec** — `openspec/changes/<change-name>/`
3. **Architecture** — ≥1 mermaid diagram (see guidelines below)
4. **Files changed** — table: file | purpose
5. **Test plan** — checkboxes from tasks + verify commands
6. **Parallel context** — batch number; sibling changes; `--rebase-only` after external merge

Example mermaid block to embed in the PR body:

    ## Architecture
    ```mermaid
    flowchart TD
      A[User action] --> B[Component]
      B --> C[API / store]
    ```

### Mermaid guidelines

- **UI change:** `flowchart` from user entry → components touched
- **API change:** `sequenceDiagram` client → controller → service → DB
- **Data model:** `classDiagram` or `erDiagram` for new types/fields
- Keep diagrams ≤ 15 nodes; link to `design.md` for detail

## State file

`.cursor/agents/state/parallel-integration.json`:

```json
{
  "history": [
    {
      "change": "fix-profile-photo-crop-empty-src",
      "mode": "merge",
      "integratedAt": "2026-05-25T22:00:00.000Z",
      "mergeCommitSha": "abc1234",
      "rebasedSiblings": ["entity-url-in-title"]
    },
    {
      "change": "auto-generated-cv-title",
      "mode": "pr",
      "integratedAt": "2026-05-25T22:30:00.000Z",
      "prUrl": "https://github.com/org/repo/pull/42",
      "prNumber": 42
    }
  ]
}
```

## Hard rules

- One change per integration
- Never auto-resolve merge/rebase conflicts
- PR mode: ≥1 mermaid diagram in body
- Rebase siblings only after merge to `main` (not when PR is merely opened)
- Invoke `opsx-parallel-integrator` subagent for execution; do not skip verify step
- Do not modify `apps/api/test/e2e/*.e2e-spec.ts` during integration unless the merged change's **E2E test impact** lists those files under **Update required** or **Add**; unrelated E2E failures after merge indicate a contract break — fix the implementation, not the regression test
