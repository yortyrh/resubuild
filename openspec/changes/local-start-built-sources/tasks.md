## 1. Root script addition

- [x] 1.1 Add `"start": "pnpm -r --parallel run start"` to the `scripts` block in the root `package.json` (placed immediately after the `build` script for discoverability).
- [x] 1.2 Verify the script is reachable via `pnpm start --help` (pnpm echoes the underlying command) and that no workspace without a `start` script is invoked.

## 2. `apps/api` script alignment with production

- [x] 2.1 Change `apps/api/package.json` `start` from `nest start` to `node dist/main` so the root `pnpm start` boots the API from compiled output (matching `apps/api/railway.json`).
- [x] 2.2 Rename the old TS-source script to `start:dev` (`nest start`) so the one-shot TS-source boot path is preserved under a new name.
- [x] 2.3 Remove the now-redundant `start:prod` script (its semantics are owned by the new `start`).

## 3. Documentation

- [x] 3.1 Update `apps/api/README.md` to reference `pnpm start` (not `pnpm start:prod`) in the Devtools production-gating note.
- [x] 3.2 Update the Scripts section of `apps/api/README.md` to list `pnpm start` alongside `dev`, `build`, `test`.

## E2E test impact

None — scripts-only change. No E2E specs are updated; the existing E2E catalog under `openspec/specs/e2e-testing/spec.md` continues to pass unchanged (the change adds a developer-experience command, not any runtime behavior exercised by E2E tests).
