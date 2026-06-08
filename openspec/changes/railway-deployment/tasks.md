## 1. Railway service config files

- [x] 1.1 Add `apps/api/railway.json` for the api service
      (Railway discovers the config file at the service root
      directory, so it sits next to `apps/api/Dockerfile`):
      `{ "build": { "builder": "DOCKERFILE", "dockerfilePath":
"apps/api/Dockerfile" }, "deploy": { "startCommand": "node
apps/api/dist/main", "healthcheckPath": "/_health" } }`.
      The `dockerfilePath` is resolved relative to the **repo
      root** by Railway (the Root Directory service setting
      does not apply to paths inside `railway.json` — see
      https://docs.railway.com/builds/build-configuration), so
      the value MUST be the repo-root-relative path
      `apps/api/Dockerfile`, not just `Dockerfile`. The
      healthcheck path is `/_health` to match the endpoint
      declared by
      `apps/api/src/health/health.controller.ts`
      (`@Get('_health')`) and the existing
      `docker-compose.prod.yml` curl healthcheck.
- [x] 1.2 Add `apps/web/railway.json` for the web service:
      `{ "build": { "builder": "DOCKERFILE", "dockerfilePath":
"apps/web/Dockerfile" }, "deploy": { "startCommand":
"pnpm --filter @resubuild/web start", "healthcheckPath":
"/" } }`. Same `dockerfilePath` rule as 1.1 — repo-root-
      relative, not relative to the `apps/web/` service
      directory.
- [x] 1.3 Add `.railwayignore` at the repo root excluding
      `node_modules` (and `**/node_modules`), `.turbo`
      (and `**/.turbo`), `.next` (and `**/.next`), `.git`,
      `coverage` (and `**/coverage`), and `**/dist`. Keep the
      file short (one pattern per line, `#`-prefixed section
      header for clarity, no glob wildcards beyond what
      Railway's ignore parser supports — see
      https://docs.railway.com/reference/config-as-code).

## 2. Schema + drift tests for the new `railway.json` files

- [x] 2.1 Add `scripts/lib/railway-config.spec.mjs` (a new
      unit test colocated under `scripts/lib/` per the project
      rule that unit tests sit beside the tested file). The
      test MUST `JSON.parse` both `railway.json` files, assert
      both have `build.builder === "DOCKERFILE"`, assert both
      have a non-empty `build.dockerfilePath` equal to the
      repo-root-relative path `apps/{service}/Dockerfile`
      (because Railway resolves `dockerfilePath` from the
      repo root — a bare `Dockerfile` would point at a
      non-existent repo-root file), assert both have a non-
      empty `deploy.startCommand`, and assert both have a
      non-empty `deploy.healthcheckPath` that starts with `/`.
      Each assertion failure MUST name the file and the
      missing field.
- [x] 2.2 Add a `path` smoke check: assert the
      `build.dockerfilePath` in each `railway.json` resolves to
      a real file in the repo (using
      `fs.existsSync(path.join(repoRoot,
config.build.dockerfilePath))`, which matches Railway's
      repo-root resolution of `dockerfilePath`). The check
      prevents silent drift if the Dockerfile is renamed or
      moved.
- [x] 2.3 Confirm `pnpm test -- --run` from the repo root picks
      the new spec file up (the root `pnpm test` script already
      delegates to `vitest run --config vitest.config.mjs` per
      the prod-env-bootstrap-helper pattern; the new
      `scripts/lib/railway-config.spec.mjs` MUST be matched by
      the existing glob).

## 3. Extend `scripts/lib/env-prod-schema.mjs` with the Railway target

- [x] 3.1 Add a new optional `DEPLOY_TARGET` key to the
      manifest schema module
      (`scripts/lib/env-prod-schema.mjs`). Allowed values:
      `"docker-compose"` (default) and `"railway"`. The
      schema MUST reject any other value with a one-line error
      that names the supported targets. The key is internal to
      the generator and MUST NOT appear in
      `apps/api/.env.example` or `apps/web/.env.example`.
- [x] 3.2 Extend `serializeToDotenv(manifest, options)` to
      accept a `target: "docker-compose" | "railway"` option
      (default `"docker-compose"`). When `target === "railway"`,
      the four public-URL keys (`CORS_ORIGIN`, `APP_URL`,
      `PUBLIC_API_URL`, `NEXT_PUBLIC_API_URL`) MUST serialize
      with Railway-shaped placeholders (e.g.
      `https://<service>.up.railway.app`) instead of the
      docker compose placeholders. The `docker-compose` value
      MUST preserve the existing behavior verbatim — the
      `prod-env-bootstrap-helper` drift test
      (`scripts/lib/env-prod-schema.spec.mjs`) MUST stay
      green.
- [x] 3.3 Add a `--target <name>` flag to
      `scripts/setup-prod-env.mjs` that forwards to
      `serializeToDotenv` via the schema module. When the
      manifest declares `DEPLOY_TARGET` explicitly and the CLI
      flag disagrees, the manifest's value wins and a one-line
      warning is printed to stdout. When the manifest's
      `DEPLOY_TARGET` is not in the closed set, the script
      MUST exit non-zero before writing any file.
- [x] 3.4 Extend the unit test
      `scripts/lib/env-prod-schema.spec.mjs` with three new
      cases: (a) serializing with `target: "railway"` writes
      the four public-URL keys with Railway placeholders, (b)
      serializing with `target: "docker-compose"` writes the
      existing placeholders verbatim (regression guard for
      the existing docker compose target), (c) a manifest
      with an unknown `DEPLOY_TARGET` is rejected with the
      supported-targets list in the error.
- [x] 3.5 Confirm `pnpm test -- --run` from the repo root runs
      the new cases. No change to the existing schema drift
      test is required.

## 4. The `pnpm deploy:railway` preflight wrapper

- [x] 4.1 Add `scripts/deploy-railway.mjs` (a new thin Node
      ESM script next to `scripts/setup-prod-env.mjs`). It
      MUST (a) read `.env.prod` at the repo root, (b) reuse
      the `scripts/lib/env-prod-schema.mjs` validator to
      confirm every required key is present and well-formed,
      (c) exit non-zero with a one-line error naming the
      missing or invalid keys on validation failure, (d) on
      success, print the two `railway up --service <name>`
      commands and exit zero. The script MUST NOT call
      `railway up` itself.
- [x] 4.2 Wire the script into the root `package.json` as
      `"deploy:railway": "node scripts/deploy-railway.mjs"`.
      Do NOT add the script to `pnpm verify` or `pnpm test`.
- [x] 4.3 Run `pnpm deploy:railway` locally against a valid
      sample `.env.prod` and confirm the two `railway up`
      commands print. Then run it against a missing
      `.env.prod` and confirm the one-line error message.

## 5. `.gitignore` and tracked-file guards

- [x] 5.1 Add `.railway/` to the root `.gitignore`, in the
      same alphabetical block as the existing `.env.prod` and
      `prod-secrets.json` entries, with a short comment
      grouping them as deploy-time machine-local artifacts.
- [x] 5.2 Run `git check-ignore -v .railway/config.json` and
      confirm the file is ignored. Run
      `git check-ignore -v .env.prod` and confirm it is
      ignored (regression guard for the prod-env-bootstrap-helper
      change).

## 6. Cursor SKILL and cursor command

- [x] 6.1 Add `.cursor/skills/railway-deploy/SKILL.md` with
      the structure from the
      `openspec/changes/railway-deployment/specs/railway-deployment/spec.md`
      "operator workflow" requirement: `## When to use`,
      `## When NOT to use`, `## Inputs`, `## Workflow`,
      `## Known limitations`, `## Guardrails`, `## Related
files`. The SKILL MUST walk the operator through the
      seven steps in the spec, MUST write the manifest to
      `prod-secrets.json` (or reuse one on disk), MUST invoke
      `pnpm setup:env:prod --target railway --from
prod-secrets.json --dry-run` first, and MUST NEVER
      echo secret values back to the user. The Guardrails
      section MUST list the four known limitations (no
      Puppeteer cache volume on the free tier, no automated
      custom-domain TLS, no preview environments, public-URL
      handshake) so an LLM agent cannot accidentally claim
      "Deploy to Railway is fully featured".
- [x] 6.2 Add `.cursor/commands/railway-deploy.md` (invoked
      as `/opsx:railway-deploy`) as a thin one-shot wrapper
      that: (a) confirms `prod-secrets.json` exists (writes
      one if not), (b) runs `pnpm setup:env:prod --target
railway --from prod-secrets.json --dry-run` and prints
      the output, (c) stops and asks the operator to confirm
      before invoking the script without `--dry-run` and
      before invoking `pnpm deploy:railway`. The command MUST
      NOT call `railway up` directly — the operator runs
      `pnpm deploy:railway` and the two `railway up` commands
      manually.

## 7. README cross-links

- [x] 7.1 Add a "Deploy to Railway" subsection inside the
      existing **Release 1: cloud Supabase + docker compose**
      section of the root `README.md`. The subsection MUST
      list: (1) the env vars the operator should pre-gather,
      (2) the `pnpm setup:env:prod --target railway --from
prod-secrets.json` command, (3) the link to the
      `railway-deploy` SKILL, the `/opsx:railway-deploy`
      cursor command, the two `railway.json` files, and
      `.railwayignore`, (4) the four known limitations as a
      short bulleted list, (5) a "Verify" subsection with the
      two `curl` checks against the Railway-printed public
      domains. The subsection MUST NOT duplicate the docker
      compose walkthrough — it points back to the existing
      "Release 1: cloud Supabase + docker compose" section
      for the env-var collection step.

## 8. Verify

- [x] 8.1 Run `pnpm verify` locally and confirm the verify
      chain finishes (format:check, lint, typecheck, test,
      build). The new unit tests in
      `scripts/lib/railway-config.spec.mjs` and the new
      cases in `scripts/lib/env-prod-schema.spec.mjs` MUST
      run as part of `pnpm test -- --run`.

      Note: `pnpm verify` requires Node 22.x via
      `scripts/check-node-version.mjs`. The current local
      sandbox has Node 26, so the strict version guard fails
      before reaching the actual gates. Each individual gate
      was run separately and all pass:
      `pnpm format:check` (clean after `pnpm format`),
      `pnpm lint` (exit 0, only pre-existing warnings in
      apps/web/src/components/cv/*), `pnpm typecheck` (all
      10 turbo tasks pass), `pnpm test:verify` (799 api
      tests + 42 script tests across 2 spec files, all pass),
      `pnpm build` (all 6 turbo tasks pass).

- [x] 8.2 Run `pnpm setup:env:prod --target railway --from
<sample manifest> --dry-run` against a throwaway
      manifest and confirm the printed dotenv contains the
      Railway-shaped URL placeholders.
- [x] 8.3 Run `pnpm setup:env:prod --target railway --from
<sample manifest>` and confirm `.env.prod` is written
      with UTF-8 LF line endings, then run
      `pnpm deploy:railway` and confirm the two `railway up`
      commands print and the script exits zero.
- [x] 8.4 Re-run `pnpm setup:env:prod --target railway --from
<sample manifest>` (the script overwrites the file on
      second run) and confirm the `AI_AGENT_ENCRYPTION_KEY`
      does not change (i.e. the script does not regenerate
      an existing real key).
- [x] 8.5 Run `git check-ignore -v .railway/config.json` and
      `git check-ignore -v .env.prod` and confirm both are
      ignored. Run `pnpm format:check && pnpm lint` and
      confirm the new `railway.json` and `.railwayignore`
      files pass the Prettier / Biome checks.

## 9. Follow-up: production custom domains + scale to zero (post-`/opsx:apply`)

- [x] 9.1 Bake the production custom domains
      (`app.resubuild.dev` for the web app,
      `api.resubuild.dev` for the API) into the
      `defaultsForTarget('railway')` function in
      `scripts/lib/env-prod-schema.mjs`. Drop the
      `*.up.railway.app` placeholders — the operator no
      longer has to find-and-replace.
- [x] 9.2 Update the "Railway target" reminder comment
      inside `serializeToDotenv` to point the operator at
      the two dashboard steps the generator cannot encode
      (custom-domain attachment + App Sleeping toggle).
- [x] 9.3 Update `scripts/setup-prod-env.mjs`'s `--target`
      help text and the post-write "Next" log line to use
      the production custom domains instead of the
      placeholders.
- [x] 9.4 Update `scripts/deploy-railway.mjs`'s verify
      `curl` lines to use the real custom domains
      (`https://api.resubuild.dev/_health` and
      `https://app.resubuild.dev/`).
- [x] 9.5 Update the `env-prod-schema.spec.mjs` assertions
      to expect the production custom domains for the
      `target=railway` test and the docker-compose
      regression guard (which now asserts the absence of
      `resubuild.dev` in the docker-compose output).
- [x] 9.6 Update `.cursor/skills/railway-deploy/SKILL.md`:
      (a) the Inputs section now states the four
      public-URL keys default to the production custom
      domains, (b) Step 4 gains a 4c "Attach the custom
      domains" substep and a 4d "Enable App Sleeping
      (scale to zero)" substep, (c) the per-service
      Variables tables use the real domains, (d) Step 6
      drops the find-and-replace language, (e) Step 7's
      verify `curl` lines use the real domains, and (f)
      the "Known limitations" section adds the App
      Sleeping caveat and drops the "no automated
      custom-domain TLS" bullet.
- [x] 9.7 Update `.cursor/commands/railway-deploy.md` to
      mirror the SKILL changes (Steps 1, 2, 3, 4, 5).
- [x] 9.8 Update `README.md`'s "Deploy to Railway"
      subsection: drop the "no automated custom-domain
      TLS" limitation, swap the verify `curl` lines for
      the real custom domains, and add the App Sleeping
      requirement in the "Service topology and scale-to-
      zero" paragraph.
- [x] 9.9 Update `openspec/changes/railway-deployment/
proposal.md`: the workflow steps now mention
      custom-domain attachment + App Sleeping, and the
      "no custom-domain TLS automation" limitation
      bullet is removed.
- [x] 9.10 Update `openspec/changes/railway-deployment/
design.md`: D3 is rewritten to describe the baked-in
      production custom domains, D6 is added to document
      the App Sleeping decision, the "Risks / Trade-offs"
      section drops the "no automated custom-domain TLS"
      risk and adds an App Sleeping risk, and the
      Migration Plan is restructured to add Steps 7-8
      (custom-domain attachment + App Sleeping).
- [x] 9.11 Update `openspec/changes/railway-deployment/
specs/prod-env-bootstrap-helper/spec.md`: the
      `--target railway` requirement bakes the production
      custom domains instead of writing placeholders, and
      the Scenarios reflect the new "no
      find-and-replace" behavior.
- [x] 9.12 Update `openspec/changes/railway-deployment/
specs/railway-deployment/spec.md`: add a new
      "App Sleeping" requirement with two Scenarios
      (operator enables App Sleeping; operator forgets),
      update the umbrella Scenario that mentions
      `up.railway.app` placeholders, and rewrite the
      "Known limitations" section to match the
      four-bullet list (no Puppeteer cache volume, no
      preview environments, public-URL handshake, App
      Sleeping is a per-service dashboard toggle).
- [x] 9.13 Re-run `pnpm format:check && pnpm lint && pnpm
test -- --run` and confirm all green after the
      follow-up edits.

## E2E test impact

### Must pass unchanged

- All scenarios in `apps/api/test/e2e/local-supabase.e2e-spec.ts`
  (auth, CV, media, export, template presentation, lifecycle,
  sections, AI agent, import LLM, import URL, MCP, JSON
  export). This change is a deploy-target addition; it does
  not touch the API contract, the database, the auth flow,
  the CV persistence shape, or the
  `apps/api/test/e2e/jest-e2e.config.cjs` config. The
  e2e config's `maxWorkers: 1` and `--runInBand` are
  unchanged.

### Update required

- None.

### Add

- None. The new behavior is exercised by the new unit tests
  in `scripts/lib/railway-config.spec.mjs` and the new
  cases in `scripts/lib/env-prod-schema.spec.mjs`, plus the
  `pnpm deploy:railway` preflight check and the SKILL's
  dry-run integration check. An E2E test that deploys to
  Railway would belong to a sibling release-1 change
  (a CI/CD automation change), not to this deploy-target
  change.
