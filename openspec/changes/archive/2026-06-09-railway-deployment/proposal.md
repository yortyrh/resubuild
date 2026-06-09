## Why

Release 1 of resubuild is already deployable via `docker-compose.prod.yml`
against a cloud Supabase project, but that target requires the operator
to provision and run a Docker host themselves. Railway is a managed
container platform that builds the same `apps/api/Dockerfile` and
`apps/web/Dockerfile`, gives every service a public HTTPS endpoint,
and injects a `PORT` env var at runtime — so a second, fully managed
release-1 target is achievable by adding (a) one
`railway.toml`/service config per app, (b) a small env-var
documentation pass that surfaces the Railway-specific variables
(`PORT` honoring, `RAILWAY_PUBLIC_DOMAIN`, the absence of a shared
internal network), and (c) a Cursor SKILL that walks the operator
through wiring the two services and pointing them at the same
`.env.prod` shape the docker compose target already consumes.

## What Changes

- Add a `railway.json` (Railway's config-as-code file) at each
  service's root directory: `apps/api/railway.json` and
  `apps/web/railway.json`. Each `railway.json` declares the
  build (`builder: "DOCKERFILE"` + `dockerfilePath:
"apps/{service}/Dockerfile"`, resolved from the repo
  root — Railway's Root Directory setting does not affect
  paths inside `railway.json`) and the deploy
  (`startCommand` + `healthcheckPath`). The api's
  `startCommand` is `node apps/api/dist/main`; the web's is
  `pnpm --filter @resubuild/web start`. Both reuse the existing
  multi-stage Dockerfiles verbatim — no `Dockerfile.railway` fork.
- Add a `.railwayignore` at the repo root so the Railway build
  context excludes `node_modules`, `.turbo`, `.next`, `.git`,
  `coverage`, and the `dist` artifacts of workspaces that will be
  rebuilt inside the container. The build context is the repo root
  (the existing Dockerfiles expect a monorepo context); a thin
  ignore file keeps the upload size sane and mirrors what
  `.dockerignore` would do for the local compose target.
- Add `.cursor/skills/railway-deploy/SKILL.md` and a matching
  cursor command `.cursor/commands/railway-deploy.md` that guide an
  operator (or an LLM agent) through: (1) generating
  `.env.prod` with the existing `pnpm setup:env:prod` flow, (2)
  creating the Railway project, (3) creating the `api` and `web`
  services from the same repo, (4) attaching the production
  custom domains (`app.resubuild.dev` to the web service and
  `api.resubuild.dev` to the api service), (5) enabling App
  Sleeping (Railway's scale-to-zero toggle) on each service, (6)
  pasting the `.env.prod` values into Railway's per-service
  Variables tab, and (7) triggering the first deploy. The SKILL
  does not invent new env-var surface — it reuses the keys
  already declared in `scripts/lib/env-prod-schema.mjs`.
- Extend the root `README.md` Release 1 section with a "Deploy to
  Railway" subsection that links to the SKILL, the cursor command,
  the two `railway.json` files, and the existing `.env.prod`
  generator. The subsection MUST be honest that Railway's free
  tier does not include a persistent volume (Puppeteer's chromium
  cache is regenerated on every cold start from App Sleeping) and
  that this release-1 Railway target is intentionally minimal —
  no CDN, no preview environments. The custom-domain TLS
  automation (Let's Encrypt via Railway's "Custom Domain"
  feature) is a built-in Railway capability the operator wires up
  per service, not a release-1 script the SKILL has to write.
- Extend the `prod-env-bootstrap-helper` spec with an additive
  requirement that documents the Railway-specific defaults the
  generator can write (it does not auto-detect Railway; the
  operator opts in via a `--target railway` flag that bakes the
  production custom domains into the four public-URL keys so the
  generated `.env.prod` is immediately deployable — no
  find-and-replace step is required as long as the operator
  attaches the matching custom domains to the corresponding
  services in the Railway dashboard). The script still does not
  store secrets in version control.
- Add an additive requirement to `monorepo-and-toolchain` that
  requires the root `package.json` to expose a `deploy:railway`
  script which (a) validates that `.env.prod` exists and is
  well-formed, (b) runs `railway link` non-interactively when a
  `RAILWAY_PROJECT_ID` is set in the environment, and (c) prints
  a one-line summary of the next manual step
  (`railway up --service api` then `railway up --service web`).
  The script is a thin wrapper; the heavy lifting stays in the
  Railway CLI.
- Add `.railway/`, `.env.prod`, and `prod-secrets.json` to
  `.gitignore` (the first two are new entries; the latter two are
  already gitignored by the prod-env-bootstrap-helper change — we
  re-assert them here for the Railway context so a reader
  auditing `.gitignore` sees the full set of deploy-time
  machine-local artifacts).

## Capabilities

### New Capabilities

- `railway-deployment`: defines the contract for the Railway
  release-1 target — the two `railway.json` files, the SKILL, the
  cursor command, the `deploy:railway` root script, and the
  Railway-specific defaults the env-var generator can write. The
  spec is small and focuses on the deployable artifact shape plus
  the operator workflow; it does not redefine the env-var
  contract (that lives in `prod-env-bootstrap-helper`).

### Modified Capabilities

- `prod-env-bootstrap-helper`: an additive requirement documents
  the Railway-specific defaults the generator can emit (no
  behavior change for the docker compose target). The existing
  release-1 docker compose requirements stay intact.
- `monorepo-and-toolchain`: an additive requirement grows the
  "Root scripts SHALL support local Supabase setup, E2E
  execution, and local API debug helpers" requirement with a
  `pnpm deploy:railway` entry, and a new requirement locks in
  the `.railway/` and `.railwayignore` files as part of the
  release-1 deploy surface.

## Impact

- `railway.json` (new at each service's root directory,
  `apps/api/railway.json` and `apps/web/railway.json`) —
  configures each service's build to use the existing
  service-local `Dockerfile`.
- `.railwayignore` (new at repo root) — excludes
  `node_modules`, `.turbo`, `.next`, `.git`, `coverage`, and
  per-app `dist` to keep the Railway build context small.
- `.cursor/skills/railway-deploy/SKILL.md` (new) and
  `.cursor/commands/railway-deploy.md` (new) — operator / LLM
  workflow for the Railway target. Reuses the
  `setup-prod-env` SKILL's manifest-on-disk pattern so secrets
  never round-trip through chat.
- `package.json` (root) — adds `deploy:railway` script (thin
  wrapper around the Railway CLI).
- `scripts/setup-prod-env.mjs` (root) — adds a `--target
railway` flag that switches the public-URL placeholders to a
  Railway-friendly template. The existing `docker compose`
  target keeps its current default template; this is purely
  additive.
- `scripts/lib/env-prod-schema.mjs` (root) — declares the new
  optional `DEPLOY_TARGET` manifest key and the Railway-specific
  URL templates. The drift test against
  `apps/api/.env.example` and `apps/web/.env.example` is
  unchanged.
- `.gitignore` — adds `.railway/` next to the existing
  `.env.prod` and `prod-secrets.json` entries.
- `README.md` — adds the "Deploy to Railway" subsection inside
  the existing Release 1 section.
- `openspec/specs/railway-deployment/spec.md` (new) — the
  umbrella spec for this change.
- `openspec/specs/prod-env-bootstrap-helper/spec.md` —
  additive requirement delta for the Railway target.
- `openspec/specs/monorepo-and-toolchain/spec.md` — additive
  requirement deltas for `pnpm deploy:railway`,
  `railway.json`, and `.railwayignore`.

No API contract changes, no database migrations, no source-code
changes in `apps/web/src` or `apps/api/src`. The api service
already reads `process.env.PORT` (see `apps/api/src/main.ts`
line 27), so Railway's auto-injected `PORT` works without
code changes. The Next.js service is started with
`pnpm --filter @resubuild/web start` which delegates to
`next start`; Next.js reads `process.env.PORT` natively.
The Puppeteer chromium cache (the named volume in the docker
compose target) has no Railway equivalent on the free tier —
this is documented as a known limitation in the SKILL and the
spec, not a code change.
