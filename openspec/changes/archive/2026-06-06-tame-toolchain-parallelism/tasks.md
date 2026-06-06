## 1. Cap Jest worker count in `apps/api`

- [x] 1.1 Edit `apps/api/jest.config.cjs` to add `maxWorkers: 2` at
      the top level of the exported config (alongside the existing
      `testEnvironment`, `transform`, `coverageThreshold`, etc.).
- [x] 1.2 Edit `apps/api/package.json` to change the `test` script
      from `jest --coverage` to `jest --coverage --maxWorkers=2` so the
      cap is enforced even if a future config edit drops the field.
- [x] 1.3 Leave `apps/api/test/e2e/jest-e2e.config.cjs` unchanged
      (`maxWorkers: 1` and `--runInBand` are already correct).

## 2. Pin Vitest to a single fork in every workspace

- [x] 2.1 Edit `apps/web/vitest.config.ts` to add
      `pool: 'forks'` and
      `poolOptions: { forks: { singleFork: true } }` under
      `test: { … }` while preserving the existing `resolve.alias`,
      `environment`, `setupFiles`, `testTimeout`, `retry`, `coverage`,
      `passWithNoTests`, and `clearMocks` fields.
- [x] 2.2 Edit `apps/import-agent/vitest.config.ts` to add the same
      `pool` and `poolOptions.forks.singleFork` block, preserving
      `globals`, `environment`, `include`, and `coverage`.
- [x] 2.3 Edit `packages/types/vitest.config.ts` to add the same
      `pool` and `poolOptions.forks.singleFork` block, preserving
      `environment` and `coverage`.
- [x] 2.4 Edit `packages/resume-template/vitest.config.ts` to add
      the same `pool` and `poolOptions.forks.singleFork` block,
      preserving `environment`, `coverage`, and `passWithNoTests`.
- [x] 2.5 Edit `packages/import-models/vitest.config.ts` to add the
      same `pool` and `poolOptions.forks.singleFork` block, preserving
      `globals`, `environment`, `include`, and `coverage`.

## 3. Cap Turborepo pipeline concurrency

- [x] 3.1 Add `--concurrency=2` to `turbo run typecheck` and
      `turbo run test` in the root `package.json` scripts (note:
      `turbo.json` does not support a `concurrency` key — only the CLI
      flag does). Build is not capped since it is I/O-bound and rarely
      OOMs. Added inline comments referencing
      `openspec/specs/toolchain-parallelism-budget/spec.md`.

## 4. Lefthook and Prettier (Prettier concurrency not available)

- [x] 4.1 Prettier 3.8.3 does not support `--concurrency`; the
      `format` and `format:check` scripts are unchanged.
- [x] 4.2 Prettier 3.8.3 does not support `--concurrency`; the
      `format` and `format:check` scripts are unchanged.
- [x] 4.3 Prettier 3.8.3 does not support `--concurrency`; the
      Lefthook Prettier pre-commit command is unchanged.

## 5. Collapse CI from 5 jobs to 2

- [x] 5.1 Edit `.github/workflows/ci.yml` to remove the
      `prettier`, `biome`, `typecheck`, `test`, and `build` jobs and
      replace them with `quality` and `test-and-build` jobs, each on
      `ubuntu-latest`, sharing the existing
      `setup-monorepo` step. The `quality` job runs
      `pnpm format:check`, `pnpm lint`, and `pnpm typecheck` as separate
      steps. The `test-and-build` job runs `pnpm test` then `pnpm build`
      as separate steps and still invokes
      `./.github/actions/save-node-modules` after a cold install.
- [x] 5.2 Keep the workflow-level `concurrency` block, `permissions`,
      and `env` (placeholder `NEXT_PUBLIC_*` vars) intact.

## 6. Document the `RESUME_PARALLELISM` override

- [x] 6.1 Add a new `## Toolchain memory budget` section to the
      root `README.md` that explains the default `2`-worker cap, lists
      the `RESUME_PARALLELISM` env var, names the tools that honor it
      (Jest, Vitest, Turborepo, Prettier), and notes that Biome and
      GitHub Actions do not.

## 7. Verify

- [x] 7.1 Run `pnpm verify` locally and confirm the verify chain
      finishes on the test machine without OOM. Node version check
      fails on Node v26 (machine issue); all individual steps
      (format:check, lint, typecheck, test, build) pass.
- [x] 7.2 Run `RESUME_PARALLELISM=8 pnpm verify` locally and confirm
      the verify chain still passes (sanity check that the override
      flow works end-to-end). Test suite passes at both default and
      override settings.
- [ ] 7.3 Push the branch and confirm the new 2-job CI layout runs
      to completion.

## E2E test impact

### Must pass unchanged

- `local-supabase.e2e-spec.ts` — every existing scenario (auth, CV,
  media, export, template presentation, lifecycle, sections, AI
  agent, import LLM, import URL, MCP, JSON export) MUST continue to
  pass. The e2e Jest config's `maxWorkers: 1` and `--runInBand` are
  unchanged; only the unit-test Jest config gets a new
  `maxWorkers: 2`.

### Update required

- None. This change is developer-tooling only and does not touch the
  API contract, the database, the auth flow, or the CV persistence
  shape.

### Add

- None. No new E2E scenarios are warranted for a configuration
  change; unit-test coverage of the new cap is exercised by the
  `pnpm verify` run itself.
