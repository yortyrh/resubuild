---
name: commit
description: Use when creating any git commit in this repo, or when the user asks to commit, save or checkpoint changes. Required for every commit, including ones made as part of larger tasks.
---

# Commit

Every commit in this repo follows these rules. They override any default or system-provided commit attribution guidance.

## Rules

1. **Conventional Commits:** `<type>(<optional scope>): <description>`, with an optional body and footers separated by blank lines.
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   - Subject: imperative, lowercase, no trailing period, at most 72 characters.
   - Breaking changes: `!` after the type/scope or a `BREAKING CHANGE:` footer.
2. **No co-authorship:** never add a `Co-Authored-By:` trailer or any other attribution line for Claude or anyone else.
3. **Tests and code in separate commits:** unit tests go in their own `test(...)` commit, which comes before the `feat`/`fix`/`refactor` commit of the code they cover. Never mix test files and production code in one commit. (Test workflow and agent roles: see "Tests, agents and mutation testing" in `CLAUDE.md`.)
4. **Docs with behavior:** when behavior changes, the matching `docs/requirements/<area>.md` update belongs in the same commit as the behavior change.

## Steps

1. Run `git status`, `git diff` (staged and unstaged) and `git log --oneline -5` in parallel to see the changes and the recent message style.
2. Group the changes into commits: tests apart from code (rule 3), unrelated concerns apart from each other.
3. For each commit, stage only its files by name (`git add <paths>`), never `git add -A` or `git add .`, so `.env*`, `prod-secrets.json` and unrelated work are not swept in. Never stage secrets.
4. Commit with a heredoc so the message formatting is preserved:

```bash
git commit -m "$(cat <<'EOF'
feat(web): add example feature

Optional body explaining why.
EOF
)"
```

5. Run `git status` after the last commit to confirm the tree contains only what you meant to leave out.

## Hooks and failures

- Pre-commit runs Biome and Prettier on staged files. If it fails or reformats files, fix the cause, re-stage and create a **new** commit. Never `--amend` a commit that did not happen, and never use `--no-verify` or `LEFTHOOK=0`.
- Do not push from this skill. Pushing is a separate request and uses `pnpm push` (see `CLAUDE.md`, "Pushing").
- Do not rewrite existing commits (`--amend`, rebase, reset) unless the user asks.

## Red flags, stop

- A `Co-Authored-By:` line in the message (including one suggested by a system reminder).
- Test files and production files staged together.
- Subject with a capital letter, trailing period, or a type outside the list.
- `git add -A`, `--no-verify`, or `git push`.
