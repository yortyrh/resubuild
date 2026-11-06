---
name: push
description: Use when the user asks to push, publish or upload commits or a branch to the remote in this repo. Never push with plain git push.
---

# Push

Pushes go through `pnpm push [git push args...]`, never `git push` directly. The script (`scripts/push.mjs`) runs `pnpm env-schema:check` and `pnpm verify` on HEAD, records the verified commit in `.git/`, then runs `git push`. The pre-push hook only accepts commits recorded this way, so a plain `git push` is rejected.

## Steps

1. Run `git status` and `git branch --show-current`. The working tree must be clean: `pnpm push` refuses otherwise. If it is not clean, tell the user and use the `commit` skill if they want the changes committed; never stash or discard on your own.
2. To push a branch other than the current one, check it out first.
3. Run it with a long timeout (`timeout: 600000`) or in the background, because verify takes up to a few minutes:

```bash
pnpm push                          # current branch, upstream already set
pnpm push -u origin <branch>       # first push of a new branch
```

Extra arguments go straight to `git push`.

4. Report the outcome from the real output: verify result, then the push result. If HEAD was already verified, verify is skipped when re-running after a failed push.

## Failures

- If verify fails, show the failing step and its output, then fix the cause or report it. Do not retry blindly.
- Never bypass the checks: no `--no-verify`, no `LEFTHOOK=0`, no writing the stamp in `.git/` by hand, no plain `git push`.
- Never force-push (`--force`, `--force-with-lease`) unless the user explicitly asks for it, and never to `main`.

## Red flags, stop

- Typing `git push` instead of `pnpm push`.
- "Verify is slow, I'll skip it just this once."
- Pushing with uncommitted changes by stashing them without asking.
