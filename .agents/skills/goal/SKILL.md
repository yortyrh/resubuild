---
name: goal
description: >-
  Persist on a stated objective until it succeeds. Tries whatever is mentioned
  until able to do it successfully. Use when the user invokes /goal, says
  "goal mode", "don't stop until", "keep trying until it works", or names a
  concrete outcome that must be achieved before stopping.
disable-model-invocation: true
---

# /goal — persist until success

**Mission:** tries whatever is mentioned until it is able to do it successfully.

When this skill is active, the user's message (after `/goal` or an explicit goal) is the **success condition**. Do not treat partial progress, plausible fixes, or "should work" as done. Stop only when the goal is **verified** or a **hard stop** applies.

## 1. Lock the goal

Extract one primary outcome. If ambiguous, state your interpretation in one sentence and proceed — do not stall on clarification unless the goal is literally empty.

Write internally:

```text
GOAL: <what must be true when done>
VERIFY: <command, observation, or check that proves success>
```

Examples:

| User says                             | GOAL                       | VERIFY                             |
| ------------------------------------- | -------------------------- | ---------------------------------- |
| `/goal fix the failing test`          | Named test(s) pass         | `pnpm test -- --run <path>` exit 0 |
| `/goal import this PDF without error` | Import completes in UI/API | Repro steps + no error message     |
| `/goal make CI green`                 | Failing check(s) pass      | `gh pr checks` or local equivalent |

## 2. Attempt loop

Repeat until VERIFY passes or a hard stop triggers:

1. **Plan** — Pick the next concrete action (one hypothesis per attempt).
2. **Execute** — Run tools/commands; implement fixes yourself.
3. **Verify** — Run VERIFY (or the closest objective check). Evidence before assertions.
4. **On failure** — Record what failed, why (if known), and what you will try **differently**. Never repeat the same failed approach without a new reason.
5. **Continue** — Go to step 1. Do not ask "should I continue?" between attempts.

### Attempt log (show briefly after each failure)

```text
Attempt N: <action> → <result> → next: <different action>
```

Keep the log short; full detail belongs in the final summary.

## 3. Success output

When VERIFY passes:

```markdown
## Goal achieved

**Goal:** …
**Verified by:** …
**Attempts:** N

<minimal evidence: command output, status, or observable result>
```

Then stop. No extra scope.

## 4. Hard stops (only reasons to quit without success)

Stop and report clearly if:

| Condition               | Action                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **User interrupt**      | Stop immediately; summarize progress and blockers                                                                                            |
| **Missing access**      | Need credentials, approval, paid service, or manual step only the user can do — ask once with exact instructions, then pause                 |
| **Safety / policy**     | Destructive git, force push, secrets, or rule violations — refuse that path; offer safe alternative                                          |
| **Proven impossible**   | Same root cause after ≥3 distinct approaches with evidence (e.g. upstream bug, missing API, environment constraint) — state proof, not guess |
| **Diminishing returns** | ≥8 attempts with no change in failure signature — stop with diagnosis and ranked next options                                                |

Do not use "might take a while" or uncertainty as a stop reason.

## 5. Operating rules

- **Prefer execution over explanation.** Try first; narrate briefly.
- **One variable per attempt.** Change one thing so failures are diagnosable.
- **Use project conventions.** Match existing tests, scripts, and skill workflows (e.g. `--run` for unit tests).
- **No fake success.** Lint clean, code written, or tests added ≠ goal met unless VERIFY says so.
- **Scope guard.** Achieve the stated goal only; do not expand into refactors or unrelated fixes.

## 6. Examples

**User:** `/goal get apps/import-agent tests passing`

1. GOAL: all import-agent tests pass. VERIFY: `cd apps/import-agent && pnpm test -- --run`
2. Run tests → 2 failures → fix mocks → re-run → pass → report success with exit 0.

**User:** `/goal the scanned PDF imports without "No extractable text found"`

1. GOAL: image-only PDF import succeeds end-to-end. VERIFY: import flow completes with preview data (test or manual repro).
2. Trace error → implement OCR fallback → unit test → re-run repro → success.

**User:** `/goal deploy to prod` (no credentials)

1. One message: need env/credentials or CI access — list exact missing inputs — pause (hard stop: missing access).

## 7. Interaction with other skills

- If verification is required before claiming done, follow **verification-before-completion** discipline inside each loop iteration.
- If the goal is a multi-step spec or PR workflow, use the relevant openspec/git skills **inside** this loop; /goal controls **when to stop**, not **how to bypass** those skills.
