---
name: opsx-parallel-cleanup
id: opsx-parallel-cleanup
category: Workflow
description: Remove OpenSpec parallel worktrees safely - never deletes uncommitted work without explicit confirmation
---

Remove `.worktrees/<change>/` directories and optionally delete the associated branches. Designed to be safe-by-default: uncommitted or unmerged work blocks removal unless the user explicitly confirms.

**Input** (optional):

- Empty → list all worktrees and prompt per-worktree
- `--change <name>` → only that worktree
- `--all-merged` → automatically remove every worktree whose branch is fully merged into `main`
- `--force` → required to remove worktrees with uncommitted work; combine with `--change` or `--all-merged`
- `--delete-branch` → also delete the branch (`git branch -D opsx/<name>`); defaults to keeping the branch

**Steps**

1. **Enumerate target worktrees**

   ```bash
   git worktree list --porcelain
   ```

   Filter to paths under `.worktrees/`. Apply `--change` or `--all-merged` filter.

2. **For each target, classify**

   ```bash
   cd <worktreePath>
   git status --porcelain         # dirty if non-empty
   git rev-list main..HEAD        # unmerged commits if non-empty
   ```

   Classification:
   - **clean & merged**: safe to remove silently (when `--all-merged`)
   - **clean & unmerged**: confirm — removing the worktree leaves the branch, so it's recoverable
   - **dirty**: blocked unless `--force`; show diff stat first

3. **Confirm with the user** (skip in `--all-merged` for `clean & merged` only)

   Use the AskUserQuestion tool with options like:
   - "Remove worktree (keep branch)"
   - "Remove worktree AND delete branch"
   - "Skip this worktree"

4. **Perform removal**

   From the **main repo**, NOT from inside the worktree:

   ```bash
   git worktree remove "<worktreePath>"
   # If --delete-branch:
   git branch -D "opsx/<change>"
   # Or for clean removal of merged branches:
   git branch -d "opsx/<change>"
   ```

   If `git worktree remove` fails because the worktree is dirty and `--force` was passed:

   ```bash
   git worktree remove --force "<worktreePath>"
   ```

5. **Prune stale worktree metadata**

   ```bash
   git worktree prune
   ```

6. **Report**

   ```
   ## Cleanup Complete

   Removed:
   - .worktrees/sidebar-tab-navigation (branch kept: opsx/sidebar-tab-navigation @ abc1234)
   - .worktrees/markdown-view-rendering (branch deleted)

   Kept (dirty, no --force):
   - .worktrees/language-select-filter — 4 uncommitted files

   Kept (unmerged, no confirmation):
   - .worktrees/complete-cv-field-coverage — 12 commits ahead of main
   ```

**Guardrails**

- NEVER delete a branch with unmerged commits unless the user explicitly confirms (`git branch -d` will refuse; only `-D` forces)
- NEVER use `--force` without an explicit user flag — uncommitted work is sacred
- NEVER run `cd` from inside the worktree being removed; always operate from the main repo
- If `.cursor/agents/state/parallel-plan.json` references removed changes, leave it alone — the plan is historical, the user may regenerate it
- After removing all worktrees, optionally suggest: "All parallel worktrees cleared. Run `/opsx-plan-parallel` to start a new round."
