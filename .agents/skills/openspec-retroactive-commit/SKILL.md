---
name: openspec-retroactive-commit
description: >-
  Retroactively document uncommitted work as an OpenSpec change, then land it in
  three git commits (proposal, implementation, archive). Use when the user
  implemented code without OpenSpec, says "sync openspec with my changes",
  "retroactive openspec commit", "/opsx-retroactive-commit", or wants to backfill
  spec-driven workflow after the fact.
license: MIT
compatibility: Requires openspec CLI and git.
---

# OpenSpec retroactive commit

Land work that was done **without** the normal propose → apply → archive flow. The outcome matches best practice: an archived change, synced main specs when possible, and **three separate commits** (never one squashed commit unless the user asks).

**Invoke via:** `/opsx-retroactive-commit` or an optional change name: `/opsx-retroactive-commit my-change-name`

---

## Preconditions

- There MUST be uncommitted changes (`git status` shows modified or untracked files worth committing).
- If the working tree is clean, stop and tell the user there is nothing to retroactively document.
- Do NOT run destructive git commands. Do NOT skip hooks (`--no-verify`). Do NOT amend unless the user explicitly requests it.

---

## Overview (three commits)

| Step | Action                                               | Git commit                                                                                   |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A    | Create OpenSpec change + artifacts from current diff | **Commit 1:** `docs(openspec): add <name> change proposal` — only `openspec/changes/<name>/` |
| B    | Stage and commit all other changes                   | **Commit 2:** `feat` / `fix` / … from implementation diff                                    |
| C    | Sync delta specs → main, archive change              | **Commit 3:** `docs(openspec): archive <name> change` (and sync specs when merged)           |

```text
working tree ──► openspec/changes/<name>/     ──► commit 1 (docs)
              └── apps/* packages/* …       ──► commit 2 (feat/fix)
              └── archive + openspec/specs/ ──► commit 3 (docs)
```

---

## Phase 0 — Inspect the working tree

Run in parallel:

```bash
git status
git diff --stat
git diff --cached --stat
git log -5 --oneline
```

Read enough of `git diff` (and new files) to understand **what** was built and **which capabilities** in `openspec/specs/` are affected.

**Change name**

- If the user passed a kebab-case name, use it.
- Otherwise derive from the diff (e.g. `render-basics-header` from `packages/resume-template/...`).
- If ambiguous or a folder `openspec/changes/<name>/` already exists, use **AskQuestion** — do not guess.

```bash
openspec list --json
```

Abort if `<name>` already exists under `openspec/changes/` (not archived). Offer to continue that change or pick another name.

---

## Phase A — Create the change set (no commit yet)

### A1. Scaffold

```bash
openspec new change "<name>"
```

### A2. Artifact build order

```bash
openspec status --change "<name>" --json
```

Create every artifact required by `applyRequires` (same loop as `openspec-propose`):

```bash
openspec instructions <artifact-id> --change "<name>" --json
```

**Retroactive content rules** (critical):

| Artifact                 | Content                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proposal.md`            | State clearly that this **retroactively documents work already implemented** in the working tree. **Why** = problem before; **What** = what the diff actually does; **Capabilities** = new vs modified under `openspec/specs/`. |
| `design.md`              | Decisions visible in the code (not hypothetical). Past tense where implementation exists.                                                                                                                                       |
| `tasks.md`               | Every task `- [x]` (complete). Mirror real files touched. End with **E2E test impact** per `openspec/specs/e2e-testing/spec.md`.                                                                                                |
| Delta `specs/**/spec.md` | `## ADDED` / `## MODIFIED` / `## REMOVED` requirements reflecting the diff. Read matching main specs under `openspec/specs/<capability>/spec.md` first.                                                                         |

After each artifact: re-run `openspec status --change "<name>" --json` until all `applyRequires` artifacts are `done`.

Do **not** copy `context` / `rules` blocks from CLI instructions into artifact files.

### A3. Commit 1 — OpenSpec change only

```bash
git add openspec/changes/<name>/
git commit -m "$(cat <<'EOF'
docs(openspec): add <name> change proposal

Retroactive change set documenting work already implemented in the
working tree.

EOF
)"
```

Verify: `git diff --stat` should still show implementation files unstaged.

---

## Phase B — Commit implementation

Stage everything **except** the active change folder (already committed):

```bash
git add -A
git reset openspec/changes/<name>/   # already in commit 1; harmless if empty
```

**Do not stage** (respect `.gitignore` and local-only paths):

- `supabase/.branches/`, `supabase/.temp/`
- `.samples/local-credentials.json`, `.samples/e2e-fixture.state.json`
- `.env`, `apps/*/.env` (secrets)

If `git add -A` would stage ignored secrets, stage paths explicitly instead.

**Commit message:** conventional commit from the diff (type/scope/imperative). Body only when "why" is not obvious. Match recent repo style (`feat(cv):`, `fix(web):`, etc.).

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <summary>

<optional body — why, breaking notes>

EOF
)"
```

If nothing remains to commit after commit 1, stop and report — do not create an empty commit 2.

---

## Phase C — Archive and commit 3

### C1. Delta spec assessment

If `openspec/changes/<name>/specs/` exists:

- Compare each delta to `openspec/specs/<capability>/spec.md`
- Summarize adds/modifies/removes for the user
- Prefer syncing before archive (see `openspec-archive-change` skill for merge rules)
- When merging E2E catalog updates, update `openspec/specs/e2e-testing/spec.md` **Must pass unchanged** if the change added regression guards

### C2. Archive

**Preferred** (non-interactive):

```bash
openspec archive <name> -y
```

This moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>/` and updates main specs when validation passes.

**If CLI fails** (validation, conflicts):

1. Merge delta specs into `openspec/specs/` manually (or skip with user confirmation — note in commit body: `Spec sync skipped due to …`)
2. Move manually:

```bash
mkdir -p openspec/changes/archive
mv openspec/changes/<name> openspec/changes/archive/$(date +%Y-%m-%d)-<name>
```

Fail if `openspec/changes/archive/YYYY-MM-DD-<name>` already exists.

### C3. Commit 3 — Archive (+ spec sync)

```bash
git add openspec/changes/archive/ openspec/specs/
git add -u openspec/changes/<name>/   # records deletion of active change path if needed
git commit -m "$(cat <<'EOF'
docs(openspec): archive <name> change

Move completed change to archive after retroactive implementation.
<Sync specs merged into openspec/specs — OR — Spec sync skipped due to …>

EOF
)"
```

---

## Final summary

Report to the user:

- Change name and archive path `openspec/changes/archive/YYYY-MM-DD-<name>/`
- Three commit SHAs and subjects
- Spec sync: merged / skipped (reason)
- Anything left unstaged (local Supabase branch files, gitignored samples)
- Suggest `pnpm verify` or targeted tests if the diff touched runtime code

---

## Guardrails

- **Three commits** — proposal docs, implementation, archive docs (+ specs). Do not squash unless asked.
- **Commit 1 scope** — only `openspec/changes/<name>/`, never application code.
- **Commit 2 scope** — never include `openspec/changes/<name>/` or archive paths.
- **Tasks** — all `[x]` in retroactive `tasks.md`; this is documentation of done work, not a todo list.
- **E2E section** — required in `tasks.md`; use `None — UI-only change` when appropriate.
- **User commits** — this skill assumes the user invoked `/opsx-retroactive-commit` to commit; do not commit on unrelated turns.
- **openspec-propose / openspec-archive-change** — use those skills for forward-looking work or archive-only; this skill owns the full retroactive triple-commit pipeline.
