## 1. Pin pnpm 11.8.0 in root package.json

- [x] 1.1 Update root `package.json` `packageManager` from `pnpm@10.26.0` to `pnpm@11.8.0`.
- [x] 1.2 Remove the deprecated `pnpm.onlyBuiltDependencies` block from root `package.json`.

## 2. Add `allowBuilds` to `pnpm-workspace.yaml`

- [x] 2.1 Add an `allowBuilds` map to `pnpm-workspace.yaml` listing `@nestjs/core`, `esbuild`, `lefthook`, `protobufjs`, `puppeteer`, `sharp`, and `unrs-resolver` (all set to `true`).

## 3. Bump pnpm in `apps/api/Dockerfile`

- [x] 3.1 Update builder-stage `corepack prepare pnpm@10.26.0` to `corepack prepare pnpm@11.8.0`.
- [x] 3.2 Update runtime-stage `corepack prepare pnpm@10.26.0` to `corepack prepare pnpm@11.8.0`.

## 4. Bump pnpm in `apps/web/Dockerfile`

- [x] 4.1 Update builder-stage `corepack prepare pnpm@10.26.0` to `corepack prepare pnpm@11.8.0`.
- [x] 4.2 Update runtime-stage `corepack prepare pnpm@10.26.0` to `corepack prepare pnpm@11.8.0`.

## 5. Verify

- [x] 5.1 Run `pnpm install --prefer-offline` and confirm no `pnpm.onlyBuiltDependencies` deprecation warning.
- [x] 5.2 Confirm `pnpm --version` reports `11.8.0`.

## E2E test impact

None — configuration-only change. E2E specs in `openspec/specs/e2e-testing/spec.md` are unaffected; no updates required.
