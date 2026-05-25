---
name: /opsx-plan-parallel
id: opsx-plan-parallel
category: Workflow
description: Analyze OpenSpec changes and produce a parallel-execution plan with conflict detection
---

Analyze active OpenSpec changes and produce a parallel-execution plan partitioned into safe batches.

**Input** (optional, after `/opsx-plan-parallel`):

- Empty → plan every non-archived change
- `change-a change-b change-c` → plan only the listed changes (space-separated)
- `--exclude change-x change-y` → plan all non-archived changes EXCEPT the listed ones

**Steps**

1. **Validate openspec is available**

   ```bash
   command -v openspec >/dev/null || echo "openspec CLI not on PATH"
   openspec list --json | head -1
   ```

   If the CLI is missing, stop and tell the user how to install it.

2. **Resolve the change set**
   - No args → `changes: "all"`
   - Explicit names → verify each exists via `openspec list --json`; error on unknown names
   - `--exclude` → take all non-archived, subtract excluded

3. **Invoke the planner subagent**

   Use the Task tool with `subagent_type` set to `opsx-parallel-planner` (or invoke explicitly via `/opsx-parallel-planner`). Pass the JSON contract from the subagent's spec:

   ```json
   {
     "changes": ["..."] | "all",
     "baseRef": "main"
   }
   ```

   This is a foreground subagent — block on the result.

4. **Display the planner's Markdown summary**

   Show it verbatim to the user. Highlight:
   - Total batches and total changes
   - Any hard conflicts (these force sequential batches)
   - Any soft conflicts (warn but allowed)
   - Any skipped changes with reasons

5. **Confirm next step**

   End with:

   > Plan written to `.cursor/agents/state/parallel-plan.json`.
   > Next: `/opsx-launch-parallel` to run all batches, or `/opsx-launch-parallel --batch 1` for the first batch only.

**Guardrails**

- Do not run `git worktree` or any state-changing git command in this step
- Do not modify the changes' files
- If the planner returns an error, surface it and stop — do not try to plan inline
- The plan file is overwritten on each run; warn the user if a previous plan exists with `generatedAt` < 1 hour old (they may be discarding active work)
