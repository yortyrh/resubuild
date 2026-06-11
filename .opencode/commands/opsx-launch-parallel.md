---
name: opsx-launch-parallel
id: opsx-launch-parallel
category: Workflow
description: Execute parallel OpenSpec changes, then auto-merge each to main with verify/fix between integrations
---

Execute the parallel-execution plan from `.cursor/agents/state/parallel-plan.json`. Creates one git worktree per change in each batch, launches one `opsx-change-implementer` subagent per worktree in parallel, then **automatically lands every completed change on `main`** before starting the next batch.

**Input** (optional, after `/opsx-launch-parallel`):

- Empty → run every batch sequentially, each batch's members in parallel, auto-integrate after each batch
- `--batch N` → run only batch N (1-indexed)
- `--changes a b c` → ignore batches, run only these named changes (skips conflict guarantees — use with care)
- `--dry-run` → print the actions that would be taken, create nothing, spawn nothing
- `--no-auto-integrate` → legacy behavior: implement only, do not merge (user runs `/opsx-parallel-integrate` manually)

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

   a. **Create worktrees** (cheap, no model calls).

   **Important:** Cursor sandbox shells often start with a stripped `PATH`. Always use `.cursor/scripts/worktree-add.sh` — do not call bare `git`.

   ```bash
   set -euo pipefail
   base_ref="<baseRef from plan>"
   for entry in <batch members>; do
     .cursor/scripts/worktree-add.sh "$entry" "$base_ref"
   done
   ```

   b. **Spawn implementer subagents in parallel**

   Send ONE message containing N Task tool calls (one per batch member). Each call:
   - `subagent_type`: `opsx-change-implementer`
   - `run_in_background`: `true`
   - `prompt`: JSON with `change`, `branch`, `worktreePath`, `absoluteWorktreePath`

   c. **Wait for batch completion**

   Collect JSON from each implementer. If any failed or paused, surface the report. Skip failed/paused changes in the integration loop; continue with completed siblings unless the user stops.

   d. **Auto-integrate loop (default — skip with `--no-auto-integrate`)**

   After implementers finish, for **each completed change in the batch** (plan order within the batch):
   1. **Pre-merge verify in worktree** — run targeted unit/integration tests for touched packages (not only filtered `pnpm test`, which can fail coverage gates).
   2. **Merge to `main`** — `git checkout main && git merge --no-ff opsx/<change>` with a conventional commit message.
   3. **Delete worktree** — `git worktree remove .worktrees/<change> --force`.
   4. **Rebase remaining batch worktrees** — for each sibling still under `.worktrees/` from this batch: `git -C .worktrees/<sibling> rebase main`. Stop on conflict; report paths; do not auto-resolve.
   5. **Verify on `main`** — use Node from `.nvmrc` (e.g. `fnm use`), then:
      - `pnpm verify` (format, lint, typecheck, unit tests, build)
      - `pnpm test:e2e` when API/CV/import paths changed
   6. **Fix regressions on `main`** — commit fixes (format, lint, type errors, broken tests). Re-run verify until green.
   7. **Optional browser smoke** — when import/LLM/search or CV editor UX changed, use Cursor internal browser (configured API keys) to exercise critical flows.
   8. **Record integration** — append to `.cursor/agents/state/parallel-integration.json` (`change`, `mergeCommitSha`, `rebasedSiblings`, `postMergeFixes`).

   Repeat until every completed change in the batch is on `main` and its worktree is removed.

   e. **Proceed to next batch automatically**

   Do not ask "Proceed to Batch N?" unless a prior step blocked (merge conflict, paused implementer, verify still failing after fix attempts). When batch N−1 is fully integrated, start batch N.

6. **Final report**

   ```
   ## Parallel Run Complete

   **Batches run:** 2/2
   **Changes:** 3 completed, 0 paused, 0 failed
   **Merged to main:** import-social-profile-discovery, fix-cv-section-sorting, move-work-volunteer
   **Worktrees remaining:** none (batch paths)

   ### Merge commits on main
   - import-social-profile-discovery @ 1f65db0 (+ post-merge fixes)
   - fix-cv-section-sorting @ d8a7d96
   - move-work-volunteer @ c564575

   ### Verify
   - pnpm verify: pass
   - pnpm test:e2e: <pass|N failures — list>

   ### Paused / failed
   - (none)

   ### Next steps
   - Push when ready: `git push origin main`
   - Clean stale worktrees: `/opsx-parallel-cleanup`
   - Status: `/opsx-parallel-status`
   ```

**Guardrails**

- NEVER push branches unless the user explicitly asks.
- Auto-integrate **does** merge to `main` locally — that is the default behavior of this command.
- NEVER run more than one batch in parallel (only members WITHIN a batch are parallel).
- NEVER spawn more than 6 implementer subagents in parallel by default.
- NEVER auto-resolve merge/rebase conflicts — stop and report.
- If `--dry-run`, print worktree adds, subagent prompts, and the full integrate loop actions, then stop.
- Use Node 22.x from `.nvmrc` before `pnpm verify` / `pnpm test:e2e`.
- Pass absolute worktree paths to subagents.

**Related**

- Read `.cursor/skills/openspec-launch-parallel/SKILL.md` for the full integrate-loop checklist.
- Manual one-off integration: `/opsx-parallel-integrate` (same merge/rebase/verify steps, single change).
