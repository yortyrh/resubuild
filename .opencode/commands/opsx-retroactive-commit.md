---
name: opsx-retroactive-commit
id: opsx-retroactive-commit
category: Workflow
description: >-
  Retroactively document uncommitted work as OpenSpec, then commit in three
  steps (proposal, implementation, archive)
---

**Use the Skill tool to load and follow `openspec-retroactive-commit` before doing anything else.**

You implemented code without OpenSpec. This command backfills the spec-driven workflow and lands everything in **three git commits**.

**Input**: Optional kebab-case change name after the command (e.g. `/opsx-retroactive-commit render-basics-header`). If omitted, derive a name from `git diff` or ask the user.

---

## Quick reference

1. **Inspect** — `git status`, `git diff --stat`, read the diff; pick or confirm `<name>`.
2. **Create change** — `openspec new change "<name>"`; write all required artifacts (proposal, design, tasks with every item `[x]`, delta specs) describing work **already in the working tree**.
3. **Commit 1** — stage only `openspec/changes/<name>/` → `docs(openspec): add <name> change proposal`.
4. **Commit 2** — stage all remaining implementation files (not the active change folder) → conventional `feat`/`fix`/… commit.
5. **Archive** — sync delta specs to `openspec/specs/` (prefer `openspec archive <name> -y`; fall back to manual merge + `mv` per skill).
6. **Commit 3** — stage `openspec/changes/archive/` and `openspec/specs/` → `docs(openspec): archive <name> change`.

---

## Commit boundaries (do not merge)

| Commit | Paths                                              | Subject pattern                              |
| ------ | -------------------------------------------------- | -------------------------------------------- |
| 1      | `openspec/changes/<name>/` only                    | `docs(openspec): add <name> change proposal` |
| 2      | apps, packages, supabase migrations, scripts, etc. | `feat(scope): …` / `fix(scope): …`           |
| 3      | `openspec/changes/archive/…`, `openspec/specs/`    | `docs(openspec): archive <name> change`      |

---

## Retroactive proposal opener (use in proposal.md)

> This change retroactively documents work already implemented in the working tree.

Match **What Changes** and **Capabilities** to the actual `git diff`, not a plan.

---

## When to stop

- Clean working tree → nothing to do.
- Change name collision → ask user.
- Archive target `YYYY-MM-DD-<name>` already exists → fail with options (rename existing archive or pick a new date/name).
- No files left for commit 2 after commit 1 → report; skip empty commit.

---

## Output

End with: change name, archive folder, three commit hashes/subjects, spec sync status, and any intentionally unstaged local files.
