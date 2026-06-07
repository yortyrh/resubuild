## 1. Manifest schema module (`scripts/lib/env-prod-schema.mjs`)

- [x] 1.1 Create `scripts/lib/` if it does not exist (it already
      does for the existing scripts).
- [x] 1.2 Add `scripts/lib/env-prod-schema.mjs` exporting
      `parseManifest(text)`, `validateManifest(manifest, {
allowPlaceholders })`, and `serializeToDotenv(manifest,
{ groupByService: true })` as pure functions with no I/O.
      The schema MUST declare every required key
      (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `MEDIA_BUCKET`,
      `MCP_EXPORT_BUCKET`, `CORS_ORIGIN`, `APP_URL`,
      `PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL`,
      `AI_AGENT_ENCRYPTION_KEY`) and the optional keys
      (`SUPABASE_JWT_SECRET`, `CHROMIUM_EXECUTABLE_PATH`,
      `MCP_KEY_PEPPER`, `MCP_SERVER_ENABLED`,
      `MCP_EXPORT_TTL_SECONDS`, `MCP_EXPORT_MAX_BYTES`,
      `PDF_IMPORT_MAX_BYTES`, `PDF_IMPORT_ENABLED`,
      `PORT`, `NODE_ENV`, `IMPORT_MODELS_CATALOG_SOURCE`).
- [x] 1.3 Reject manifests that include the literal
      `change-me-to-a-long-random-secret` in
      `AI_AGENT_ENCRYPTION_KEY` (or the legacy
      `IMPORT_LLM_CONFIG_ENCRYPTION_KEY` alias) unless
      `allowPlaceholders: true` is passed (the script's
      `--force` flag sets this).
- [x] 1.4 Reject values that contain `\r` and reject values
      that include a NUL byte.
- [x] 1.5 Add a `scripts/lib/env-prod-schema.spec.mjs` colocated
      unit test (per the project rule that unit tests sit
      beside the tested file) covering: parses a valid
      manifest, rejects a manifest missing
      `SUPABASE_SERVICE_ROLE_KEY`, rejects a placeholder
      without the override, accepts a placeholder with the
      override, rejects a value with `\r`, serializes to a
      grouped dotenv with `# description` comments per key.

## 2. Manifest drift test against the existing example files

- [x] 2.1 Add a `scripts/lib/env-prod-schema.drift.spec.mjs`
      test (or fold it into the existing
      `env-prod-schema.spec.mjs`) that reads
      `apps/api/.env.example` and `apps/web/.env.example`,
      extracts every non-comment `KEY=value` line, and
      asserts the key appears in the manifest schema. The
      test MUST fail with a message naming the missing key
      when the example files drift from the schema.
- [x] 2.2 Add the schema module + tests to the root
      `pnpm test` pipeline. Because the module is a
      plain `.mjs` next to the other root scripts, the
      cleanest path is to add a small `vitest.config.mjs`
      at the repo root (or extend the existing one if
      present) that picks up `scripts/**/*.spec.mjs` and
      register a Turborepo task `test` in the root
      `package.json` that runs `vitest run` from the root.
      Verify `pnpm test` from the repo root picks the
      new tests up.

## 3. The script (`scripts/setup-prod-env.mjs`)

- [x] 3.1 Add `scripts/setup-prod-env.mjs` as a thin I/O
      shell over the schema module. It MUST accept
      `--from <path>`, `--output <path>` (default
      `./.env.prod`), `--dry-run`, and `--force` flags,
      and MUST support interactive prompts via
      `node:readline/promises` with hidden input
      (`process.stdin.setRawMode(true)`) for
      `SUPABASE_SERVICE_ROLE_KEY` and
      `AI_AGENT_ENCRYPTION_KEY` (when the operator did
      not pass `--from` and did not opt out of
      generation).
- [x] 3.2 When `AI_AGENT_ENCRYPTION_KEY` is missing from
      the manifest and `--from` is in use, refuse the run
      with a one-line error (the manifest must declare
      the key explicitly so CI runs are deterministic;
      only the interactive path auto-generates).
- [x] 3.3 When the manifest or interactive answers leave
      `AI_AGENT_ENCRYPTION_KEY` empty in interactive
      mode, generate one with
      `node:crypto.randomBytes(32).toString('base64')`.
- [x] 3.4 Write the file atomically: write to
      `<output>.tmp`, `fs.renameSync(tmp, output)`.
      Refuse to follow symlinks (`fs.openSync(output,
'wx')` semantics) and refuse to overwrite a path
      that resolves to a file tracked by
      `git ls-files --error-unmatch <output>`. Print
      one-line errors to stderr and exit non-zero on any
      of these conditions.
- [x] 3.5 Print a "wrote <output>" line to stdout on
      success, plus a one-line summary of how many keys
      were written, how many were generated, and how
      many were placeholders (the last count is 0 by
      default; `--force` makes it nonzero and prints a
      warning).
- [x] 3.6 Wire the script into the root `package.json`:
      add `"setup:env:prod": "node scripts/setup-prod-env.mjs"`
      (and `"setup:env:prod:dry-run": "node
scripts/setup-prod-env.mjs --dry-run"` for the
      common pre-flight check).

## 4. The `docker-compose.prod.yml` skeleton

- [x] 4.1 Add `docker-compose.prod.yml` at the repo root
      declaring two services (`web`, `api`) plus a shared
      bridge network `resubuild-net`. Both services MUST
      read `env_file: .env.prod` and MUST NOT hardcode
      secrets. The `api` service MUST additionally
      mount a named volume `resubuild-puppeteer-cache`
      at the path the api image expects (per
      `apps/api/Dockerfile`'s Puppeteer cache directory)
      so Chromium is not re-downloaded on every
      container restart.
- [x] 4.2 Add a header comment to the compose file that
      documents the intentionally minimal scope (no
      TLS, no reverse proxy, no registry push) and
      points at the follow-on release-1 changes for
      those concerns. Reference
      `openspec/specs/prod-env-bootstrap-helper/spec.md`
      in the comment so the next reader finds the
      spec.
- [x] 4.3 Verify `docker compose -f docker-compose.prod.yml
--env-file .env.prod config` parses the file
      (run locally with a sample `.env.prod`; do NOT
      commit the sample).

## 5. `.gitignore` and tracked-file guard

- [x] 5.1 Add `.env.prod` and `prod-secrets.json` to the
      root `.gitignore` (alphabetical placement, with a
      short comment grouping them with the other
      machine-local artifacts).
- [x] 5.2 The script's tracked-file guard from task 3.4
      MUST consult `git ls-files --error-unmatch
<output>` and exit non-zero with a one-line
      error if the file is tracked. The error message
      MUST name the spec
      (`openspec/specs/prod-env-bootstrap-helper/spec.md`)
      so the operator can find the rationale.

## 6. The Cursor SKILL and cursor command

- [x] 6.1 Add `.cursor/skills/setup-prod-env/SKILL.md`
      with `## When to use`, `## Inputs`, `## Workflow`,
      and `## Guardrails` sections. The SKILL MUST walk
      the operator (or LLM agent) through the same
      set of variables the script prompts for, MUST
      write the manifest to `prod-secrets.json` on
      disk, and MUST invoke the script with
      `--from <manifest>` so the secret values never
      round-trip through chat. The `## Guardrails`
      section MUST explicitly forbid echoing a
      secret value back to the user and MUST point
      agents at the manifest file as the only safe
      place for secret material.
- [x] 6.2 Add `.cursor/commands/setup-prod-env.md`
      (invoked as `/opsx:setup-prod-env`) as a thin
      one-shot wrapper. The command MUST write the
      manifest, run `pnpm setup:env:prod --from
prod-secrets.json --dry-run` first for review,
      and only on operator confirmation run the script
      again without `--dry-run` to write
      `.env.prod`. Both invocations MUST go through
      the schema module so the SKILL and the command
      cannot drift from the script.

## 7. README cross-links

- [x] 7.1 Add a **Release 1: cloud Supabase + docker
      compose** section to the root `README.md`,
      ordered as: (1) collect credentials, (2) run
      `pnpm setup:env:prod` (with a one-paragraph
      aside for the SKILL / cursor command flow),
      (3) bring up the stack with `docker compose
-f docker-compose.prod.yml up`. The section
      MUST link to the script, the SKILL, the
      cursor command, and `docker-compose.prod.yml`,
      and MUST document the intentionally minimal
      scope and the follow-on release-1 work.
- [x] 7.2 Do NOT duplicate the local-development
      walkthrough; the new section points back to
      the existing **Local development (Supabase
      CLI)** section for the `supabase link` /
      `supabase db push` step.

## 8. `apps/api` env-var documentation

- [x] 8.1 Add (or extend) a header comment block in
      `apps/api/.env.example` that documents the
      production env-var surface from the new
      `cv-rest-api` ADDED requirement. The header
      MUST list every key the release-1 generator
      writes for the api service and the
      controller / service that reads it. Keep the
      inline `# description` comments already in
      the file untouched; this is a top-of-file
      block, not a rewrite.
- [x] 8.2 Cross-link the new header block to
      `openspec/specs/prod-env-bootstrap-helper/spec.md`
      and `openspec/specs/cv-rest-api/spec.md` so
      the next reader finds the spec.

## 9. Verify

- [x] 9.1 Run `pnpm verify` locally and confirm the
      verify chain finishes (format:check, lint,
      typecheck, test, build). The new unit tests
      in `scripts/lib/*.spec.mjs` MUST run as part
      of `pnpm test` (per task 2.2).
- [x] 9.2 Run `pnpm setup:env:prod --dry-run --from
<sample manifest>` against a throwaway
      manifest and confirm the printed dotenv
      contains every required key with the expected
      grouping and comments.
- [x] 9.3 Run `pnpm setup:env:prod --from <sample
manifest>` and confirm `.env.prod` is written
      with UTF-8 LF line endings, then run
      `docker compose -f docker-compose.prod.yml
--env-file .env.prod config` and confirm it
      parses.
- [x] 9.4 Re-run `pnpm setup:env:prod --from
<sample manifest>` (the script overwrites
      the file on second run) and confirm the
      `AI_AGENT_ENCRYPTION_KEY` does not change
      (i.e. the script does not regenerate an
      existing real key).

## E2E test impact

### Must pass unchanged

- All scenarios in `apps/api/test/e2e/local-supabase.e2e-spec.ts`
  (auth, CV, media, export, template presentation, lifecycle,
  sections, AI agent, import LLM, import URL, MCP, JSON
  export). This change is a developer-tooling addition; it
  does not touch the API contract, the database, the auth
  flow, the CV persistence shape, or the
  `apps/api/test/e2e/jest-e2e.config.cjs` config. The
  e2e config's `maxWorkers: 1` and `--runInBand` are
  unchanged.

### Update required

- None.

### Add

- None. The new behavior is exercised by the script's own
  unit tests in `scripts/lib/env-prod-schema.spec.mjs`
  and the dry-run integration check in task 9.2 / 9.3.
  An E2E test that spins up the release-1 docker compose
  target would belong to a sibling release-1 change
  (the deploy / TLS change), not to this env-generator
  change.
