---
name: /opsx-launch-parallel
id: opsx-launch-parallel
category: Workflow
description: Execute the parallel-execution plan by creating worktrees and spawning implementer subagents in parallel
---

Execute the parallel-execution plan from `.cursor/agents/state/parallel-plan.json`. Creates one git worktree per change in each batch, then launches one `opsx-change-implementer` subagent per worktree in parallel.

**Input** (optional, after `/opsx-launch-parallel`):

- Empty → run every batch sequentially, each batch's members in parallel
- `--batch N` → run only batch N (1-indexed)
- `--changes a b c` → ignore batches, run only these named changes (skips conflict guarantees — use with care)
- `--dry-run` → print the actions that would be taken, create nothing, spawn nothing

**Steps**

1. **Load the plan**

   ```bash
   test -f .cursor/agents/state/parallel-plan.json || echo "MISSING_PLAN"
   ```

   If missing, tell the user: "No plan found. Run `/opsx-plan-parallel` first." and stop.

   Read the plan. Validate it has `batches` and each batch has `changes` with `name`, `branch`, `worktreePath`.

2. **Check working tree is clean**

   ```bash
   git -C . status --porcelain
   git -C . rev-parse --abbrev-ref HEAD
   ```

   If the main repo working tree is dirty, abort: "Main repo has uncommitted changes; commit or stash before launching parallel work."

   If on a non-default branch, warn but allow (worktrees branch off `baseRef` from the plan, not from `HEAD`).

3. **Pre-flight: check no worktree paths collide with existing dirs**

   For each planned worktree path:

   ```bash
   test -e <worktreePath> && echo "EXISTS: <worktreePath>"
   git worktree list --porcelain | grep -F "<worktreePath>"
   ```

   If a worktree already exists for the same branch, reuse it (idempotent). If a non-worktree directory exists at the path, abort.

4. **Select batches to run**
   - Default: all batches in order
   - `--batch N`: only that batch
   - `--changes a b c`: synthesize a single ad-hoc batch (warn that conflict guarantees are bypassed)

5. **For each batch (sequentially)**

   a. **Create worktrees in parallel** (cheap, no model calls). Run these as one Bash subagent invocation or one Shell call:

   ```bash
   set -euo pipefail
   for entry in <batch members>; do
     name="$entry"
     branch="opsx/$name"
     path=".worktrees/$name"

     # Skip if worktree already there for this branch
     if git worktree list --porcelain | awk '/^worktree / {p=$2} /^branch / {b=$2} /^$/ {if (b=="refs/heads/'"$branch"'") print p}' | grep -qx "$(pwd)/$path"; then
       echo "REUSE: $path"
       continue
     fi

     # Create branch off baseRef if it doesn't exist; otherwise check out existing branch
     if git show-ref --verify --quiet "refs/heads/$branch"; then
       git worktree add "$path" "$branch"
     else
       git worktree add -b "$branch" "$path" "<baseRef from plan>"
     fi
   done
   git worktree list
   ```

   b. **Spawn implementer subagents in parallel**

   Send ONE message containing N Task tool calls (one per batch member). Each call:
   - `subagent_type`: `opsx-change-implementer`
   - `run_in_background`: `true`
   - `prompt`: a JSON object matching the implementer's input contract, e.g.

     ```json
     {
       "change": "sidebar-tab-navigation",
       "branch": "opsx/sidebar-tab-navigation",
       "worktreePath": ".worktrees/sidebar-tab-navigation",
       "absoluteWorktreePath": "/Users/.../jsonresume-web/.worktrees/sidebar-tab-navigation"
     }
     ```

     resolve `absoluteWorktreePath` via `git rev-parse --show-toplevel` from the main repo + the relative path.

   c. **Wait for batch completion**

   Collect the JSON output from each implementer. If any failed or paused, surface the report but DO NOT auto-rollback — the user decides whether to continue to the next batch.

   d. **Confirm before next batch** (only if more batches remain)

   Show a one-line summary:

   ```
   Batch 1 done: 3 completed, 0 paused, 0 failed.
   Proceed to Batch 2? (y/N)
   ```

   Use the AskUserQuestion tool. If the user declines, stop and tell them to resume via `/opsx-launch-parallel --batch <next>`.

6. **Final report**

   After all selected batches finish (or the user stops), print:

   ```
   ## Parallel Run Complete

   **Batches run:** 2/3
   **Changes:** 6 completed, 1 paused, 0 failed

   ### Branches created (local only, not pushed)
   - opsx/sidebar-tab-navigation @ abc1234 — .worktrees/sidebar-tab-navigation
   - opsx/markdown-view-rendering @ def5678 — .worktrees/markdown-view-rendering
   - ...

   ### Paused
   - language-select-filter: <pauseReason>

   ### Next steps
   - Review a branch: `git -C .worktrees/<name> log --stat`
   - Merge into main: `git checkout main && git merge --no-ff opsx/<name>`
   - Or run `/opsx-parallel-status` for live status across worktrees
   - Clean up finished worktrees: `/opsx-parallel-cleanup`
   ```

**Guardrails**

- NEVER push branches. Implementers are forbidden from pushing; the orchestrator must not either.
- NEVER merge to main. Surface results, let the user merge.
- NEVER run more than one batch in parallel (only members WITHIN a batch are parallel).
- NEVER spawn more than 6 implementer subagents in parallel by default — token cost grows linearly. If a batch has >6 members, split it into chunks of 6 and confirm with the user.
- If `--dry-run`, print every `git worktree add` command and every subagent prompt that would be sent, then stop.
- If a worktree's `pnpm install` is likely to take >2 minutes (first run on a cold machine), warn the user upfront.
- Pass the resolved absolute path of the worktree to each subagent. Subagents cannot `cd` outside their worktree.
