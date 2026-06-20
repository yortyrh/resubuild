## ADDED Requirements

### Requirement: Root `pnpm start` SHALL boot every workspace that defines a `start` script in parallel, against built sources

The repository root `package.json` MUST expose a `pnpm start` script. The script MUST run the `start` script of every workspace package in parallel, so a single command brings the local stack up from already-built artifacts. The script MUST NOT compile sources on demand — running it without a prior `pnpm build` MUST fail fast (no implicit build step is added by this change).

The fan-out MUST use pnpm's built-in workspace parallel runner (`pnpm -r --parallel run start`), which automatically skips packages that do not declare a `start` script. No additional runtime dependency (e.g. `concurrently`) SHALL be introduced for this purpose.

For each workspace that contributes a `start` script:

- **`apps/web`** — `next start`, which boots the Next.js production server from `.next/`.
- **`apps/api`** — `node dist/main`, which boots the NestJS application from the compiled `dist/` output. This MUST match the start command used by `apps/api/railway.json` for the release-1 Railway target.

The `apps/api` workspace MUST expose a `start:dev` script that runs the Nest CLI without watch mode (`nest start`) so developers who want a one-shot TS-source boot (no compile, no watch) retain a documented entry point. The historical `start:prod` script on `apps/api` is removed because `start` now carries that semantics.

The `pnpm start` command is a foreground convenience — it is NOT wired into `pnpm verify`, `pnpm test`, or any CI job.

#### Scenario: Developer boots the full stack from built sources in one command

- **WHEN** a developer runs `pnpm build` followed by `pnpm start` from the repository root
- **THEN** the web app and the API both start in parallel
- **AND** each service uses its own `start` script (Next.js production server for web, `node dist/main` for the API)
- **AND** logs from each workspace are interleaved in the same terminal, prefixed by their package name

#### Scenario: Developer runs `pnpm start` without building first

- **WHEN** a developer runs `pnpm start` from the repository root without a prior `pnpm build`
- **THEN** `apps/api` fails fast with a "Cannot find module" error from `node dist/main`
- **AND** the developer can recover by running `pnpm build` and re-running `pnpm start`

#### Scenario: Developer still wants a one-shot TS-source boot of the API

- **WHEN** a developer runs `pnpm --filter @resubuild/api start:dev` from the repository root
- **THEN** the Nest CLI runs `nest start` against the TypeScript sources without watch mode
- **AND** the previous behavior of `apps/api`'s `start` script is preserved under the `start:dev` name

#### Scenario: Workspace without a `start` script is silently skipped

- **WHEN** `pnpm start` fans out across workspaces
- **THEN** packages that do not declare a `start` script (e.g. `apps/import-agent`, `packages/*`) are skipped
- **AND** `pnpm start` exits non-zero only if one of the workspaces that does declare a `start` script exits non-zero
