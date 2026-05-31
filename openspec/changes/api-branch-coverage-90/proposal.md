## Why

This change retroactively documents work already implemented in the working tree.

The `apps/api` Jest config enforced 90% coverage for statements, functions, and lines but only **80% for branches**, leaving conditional paths (especially in `ApplicationService` prepare/update flows) under-tested. Raising the branch threshold to 90% aligns all four global metrics and prevents regressions in error handling, cancellation, and edge-case branches that unit tests had not exercised.

## What Changes

- Raise `coverageThreshold.global.branches` from **80** to **90** in `apps/api/jest.config.cjs`.
- Add colocated Jest unit tests across API modules to meet the new threshold (~580 tests passing at **90.13%** branch coverage).
- Primary expansion in `application.service.spec.ts` (prepare/update cancel paths, retries, PDF/image intake, cover letter export, API key scoping, tailoring patches).
- Supplementary tests in `application.repository`, `application-prepare.store`, `cv-clone`, `cv-item`, `cv-export`, `import`, `media`, and `resume-schema.validator` specs.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `monorepo-and-toolchain`: Document that `apps/api` unit tests enforce **90% global coverage** for statements, branches, functions, and lines via Jest `coverageThreshold`.

## Impact

- **apps/api/jest.config.cjs** — branch threshold 80 → 90.
- **apps/api/src/**/\*.spec.ts\*\* — expanded unit test coverage (no production code changes).
- **CI / `pnpm verify`** — unit test job fails if branch coverage drops below 90%.
