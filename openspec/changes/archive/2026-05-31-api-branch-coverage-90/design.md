## Context

`apps/api` uses Jest with global `coverageThreshold` in `jest.config.cjs`. Statements, functions, and lines were already at 90%; branches lagged at 80%, allowing untested conditional paths—especially in async prepare/update job runners and export/import error handling.

## Goals / Non-Goals

**Goals:**

- Set branch coverage threshold to 90% alongside the other three metrics.
- Add focused unit tests for uncovered branches without changing production behavior.

**Non-Goals:**

- Refactoring production code for testability beyond what tests required.
- Changing web or import-agent coverage thresholds.
- Adding E2E tests for this coverage push.

## Decisions

### 1. Threshold alignment in jest.config.cjs

Raised `branches` from 80 to 90 to match statements/functions/lines. Jest fails the test run when any metric is below threshold, so CI and local `pnpm test` enforce the bar.

### 2. Test-first focus on ApplicationService

`ApplicationService` had the largest branch gap (~53% before expansion). Tests mock repositories, import-agent workflows, and `ApplicationPrepareStore` behavior via public methods (prepare, cancel, retry, update, export helpers).

### 3. Colocated spec pattern

All new tests live beside source files (`*.spec.ts`) per repo convention. Background jobs are flushed with repeated `setImmediate` ticks; cancel tests track application status via `repository.findOne` mocks so `cancel()` sees valid `queued`/`running` states.

### 4. No production code changes

Coverage was achieved purely through tests and the config threshold change.

## Risks / Trade-offs

- **Flaky async tests** → Mitigated with deterministic mocks and status-tracking `findOne` implementations; no real timers beyond `jest.useFakeTimers` only in store prune test.
- **Threshold maintenance cost** → Future features must include branch coverage or CI fails; acceptable for API quality bar.
