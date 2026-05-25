---
name: /opsx-parallel-status
id: opsx-parallel-status
category: Workflow
description: Show status of all OpenSpec parallel worktrees - tasks completed, commits, dirty state
---

Inspect every active worktree under `.worktrees/` and report progress, commit state, and verification readiness.

**Input**: none, or `--change <name>` to focus on one.

**Steps**

1. **Enumerate worktrees**

   ```bash
   git worktree list --porcelain
   ```

   Parse out worktrees whose path starts with `.worktrees/`. These are OpenSpec parallel worktrees.

2. **For each (or just the named one), gather**

   ```bash
   # Inside the worktree
   cd <worktreePath>
   git symbolic-ref --short HEAD
   git log -1 --format='%h %s' 2>/dev/null
   git status --porcelain | wc -l
   git diff --stat <baseRef>...HEAD | tail -1

   # Task progress from the worktree's own tasks.md
   change_name="<derived from branch>"
   tasks_file="openspec/changes/$change_name/tasks.md"
   total=$(grep -cE '^- \[[ x]\]' "$tasks_file")
   done=$(grep -cE '^- \[x\]' "$tasks_file")
   ```

3. **Render a table** (use markdown):

   ```
   ## Parallel Worktree Status

   | Change | Branch | Tasks | Commit | Dirty | Integrated | Files | Lines |
   |---|---|---|---|---|---|---|---|
   | sidebar-tab-navigation | opsx/sidebar-tab-navigation | 13/13 | abc1234 | 0 | merged abc1234 | 5 | +120/-30 |
   | language-select-filter | opsx/language-select-filter | 6/9 | — (uncommitted) | 4 | — | 3 | +80/-5 |
   | markdown-view-rendering | opsx/markdown-view-rendering | 10/10 | def5678 | 0 | PR #42 | 8 | +200/-15 |
   ```

   Columns:
   - **Tasks**: `done/total` from `tasks.md` in that worktree
   - **Commit**: short SHA of the latest commit (or "— (uncommitted)" if HEAD == baseRef)
   - **Dirty**: number of uncommitted files (0 means clean)
   - **Integrated**: from `parallel-integration.json` — merge SHA, `PR #N`, or `—`
   - **Files / Lines**: diff stats vs the base ref

4. **Highlight anything actionable**

   Below the table, in this order:
   - **Uncommitted dirty worktrees**: list them and suggest `cd <path> && git status`
   - **Worktrees with paused implementers** (detect by reading the last entry in `tasks.md` checkbox state vs total): list with the reason if known
   - **Conflict-prone branches**: worktrees that have diverged on files also touched by another active worktree (cheap check: scan diff filenames, look for intersections)

5. **Read integration history**

   ```bash
   test -f .cursor/agents/state/parallel-integration.json && cat .cursor/agents/state/parallel-integration.json
   ```

   Mark changes already merged or with open PRs in the table (column **Integrated**: merge SHA, PR link, or `—`).

6. **Suggest next actions**

   ```
   ### Next
   - Integrate next finished change (merge + rebase siblings): `/opsx-parallel-integrate --next --mode merge`
   - Open documented PR with diagrams: `/opsx-parallel-integrate --change <name> --mode pr`
   - Refresh siblings after external merge: `/opsx-parallel-integrate --rebase-only`
   - Resume a paused change: spawn `opsx-change-implementer` for that change with the same JSON contract (worktree already exists)
   - Discard a branch + worktree: `/opsx-parallel-cleanup --change <name>`
   ```

**Guardrails**

- Read-only command — never modify any worktree
- If `.worktrees/` doesn't exist, print "No parallel worktrees active." and stop
- If a worktree's `tasks.md` is missing, mark its Tasks column as `?/?` and add a warning
- Always show absolute path on hover/click (use code blocks for paths)
