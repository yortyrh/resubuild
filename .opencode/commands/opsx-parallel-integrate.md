---
name: /opsx-parallel-integrate
id: opsx-parallel-integrate
category: Workflow
description: Integrate one completed parallel change into main (merge + rebase siblings) or open a documented PR with diagrams
---

Integrate **one** finished OpenSpec parallel change. After integration, remaining worktrees are rebased onto updated `main` so the next change starts from current code.

**Input** (after `/opsx-parallel-integrate`):

| Flag                   | Meaning                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| _(empty)_              | Interactive: pick change + mode                                                |
| `--change <name>`      | Integrate this change only                                                     |
| `--next`               | First completed, not-yet-integrated change (plan batch order, then name)       |
| `--mode merge`         | Merge to `main`, rebase sibling worktrees                                      |
| `--mode pr`            | Push branch + `gh pr create` with mermaid diagrams (no merge)                  |
| `--rebase-only`        | Skip merge/PR; rebase all active sibling worktrees onto current `main`         |
| `--no-rebase-siblings` | Merge/PR without touching other worktrees                                      |
| `--delete-worktree`    | After successful merge, remove integrated worktree (branch kept unless merged) |
| `--dry-run`            | Print actions, mutate nothing                                                  |

**Steps**

1. **Load context**

   ```bash
   test -f .cursor/agents/state/parallel-plan.json || echo "MISSING_PLAN"
   git worktree list --porcelain
   test -f .cursor/agents/state/parallel-integration.json && cat .cursor/agents/state/parallel-integration.json
   ```

   If no worktrees under `.worktrees/`, stop: "Nothing to integrate. Run `/opsx-launch-parallel` first."

2. **Resolve target change**
   - `--change <name>` → use it; error if worktree missing
   - `--next` → scan `.worktrees/*` in plan batch order; pick first where:
     - all `tasks.md` checkboxes are `[x]`
     - branch has at least one commit ahead of `baseRef`
     - change not listed in `parallel-integration.json` as merged or with open PR merged
   - Otherwise → run `/opsx-parallel-status`, then **AskUserQuestion**: which completed change + `merge` vs `pr`

3. **Pre-flight checks (main repo)**

   ```bash
   git status --porcelain
   git rev-parse --abbrev-ref HEAD
   ```

   Main repo must be clean. On non-`main` branch, warn and ask to continue.

   For `--mode merge` or interactive merge choice:

   ```bash
   cd .worktrees/<change>
   git status --porcelain
   grep -cE '^- \[ \]' openspec/changes/<change>/tasks.md   # must be 0
   git log -1 --oneline
   ```

4. **`--rebase-only` shortcut**

   Skip implementer subagent. From main repo, for each `.worktrees/*` except optionally `--change`:

   ```bash
   git -C .worktrees/<sibling> rebase main
   ```

   On conflict: stop, report file list, suggest resolving in that worktree. Update `parallel-integration.json` with rebase results.

5. **Spawn integrator subagent**

   Use Task tool with `subagent_type`: `opsx-parallel-integrator` (foreground — block on result).

   Prompt JSON:

   ```json
   {
     "change": "<name>",
     "branch": "opsx/<name>",
     "worktreePath": ".worktrees/<name>",
     "absoluteWorktreePath": "<git rev-parse --show-toplevel>/.worktrees/<name>",
     "baseRef": "main",
     "mode": "merge" | "pr",
     "push": true,
     "rebaseSiblings": true,
     "deleteWorktreeAfterMerge": false
   }
   ```

   Map CLI flags: `--no-rebase-siblings` → `"rebaseSiblings": false`; `--delete-worktree` → `"deleteWorktreeAfterMerge": true`.

6. **Handle integrator result**

   | status              | Action                                                                         |
   | ------------------- | ------------------------------------------------------------------------------ |
   | `completed` + merge | Show merge SHA; list rebased siblings; warn on `failedRebases`                 |
   | `completed` + pr    | Show PR URL; remind that siblings rebase **after** PR merges (`--rebase-only`) |
   | `conflict`          | Print conflicted paths; stop pipeline                                          |
   | `blocked`           | Incomplete tasks — resume implementer instead                                  |
   | `failed`            | Show verify/errors                                                             |

7. **Suggest next step**

   ```
   ## Integration Complete

   **Change:** <name>
   **Mode:** merge | pr
   **Result:** <merge sha or PR URL>

   ### Siblings rebased onto main
   - change-b ✓
   - change-c ✗ (conflict in cv-sections.tsx — resolve in .worktrees/change-c)

   ### Next
   - Integrate next change: `/opsx-parallel-integrate --next --mode merge`
   - Or open PR instead: `/opsx-parallel-integrate --change <name> --mode pr`
   - Status: `/opsx-parallel-status`
   - After all merged: `/opsx-parallel-cleanup --all-merged`
   ```

**Recommended loop (batch finished → land one-by-one)**

```
/opsx-launch-parallel --batch 1
/opsx-parallel-status
/opsx-parallel-integrate --next --mode merge    # repeat until batch empty
/opsx-launch-parallel --batch 2                 # siblings already on latest main
```

**PR-first workflow (review before merge)**

```
/opsx-parallel-integrate --change auto-generated-cv-title --mode pr
# after PR merges on GitHub:
git checkout main && git pull
/opsx-parallel-integrate --rebase-only
/opsx-parallel-integrate --next --mode merge
```

**Guardrails**

- Integrate **one change at a time** — never merge two branches in one invocation
- Never auto-resolve merge/rebase conflicts
- Merge mode: never push `main` unless user explicitly asks
- PR mode: may push feature branch only; PR body **must** include ≥1 mermaid diagram
- After merge mode, sibling rebase is default — this keeps parallel work aligned with `main`
- Read `.cursor/skills/openspec-parallel-integrate/SKILL.md` for PR template and diagram guidance
