## ADDED Requirements

### Requirement: The generator SHALL accept a `--target` flag that bakes the production custom domains for the Railway target

The `pnpm setup:env:prod` script MUST accept a
`--target <name>` flag. The accepted values are
`docker-compose` (the default, preserving the existing
behavior) and `railway`. When the operator passes
`--target railway`, the script writes the four public-URL
keys (`CORS_ORIGIN`, `APP_URL`, `PUBLIC_API_URL`,
`NEXT_PUBLIC_API_URL`) with the **production custom domains**
as defaults — `CORS_ORIGIN` and `APP_URL` get
`https://app.resubuild.dev`, `PUBLIC_API_URL` and
`NEXT_PUBLIC_API_URL` get `https://api.resubuild.dev` — so the
generated `.env.prod` is immediately deployable as long as
the operator has attached the matching custom domains to the
corresponding Railway services. The script MUST print a
one-line reminder to stdout that points the operator at the
two dashboard steps (custom-domain attachment + App Sleeping
toggle) that the generator cannot encode. The manifest
always wins: any of the four public-URL keys the operator
supplies in `prod-secrets.json` overrides the Railway target
default for that key. The default target (`docker-compose`)
MUST NOT change — the existing localhost placeholders are
preserved verbatim so the docker compose target is unaffected.

#### Scenario: Operator generates `.env.prod` for the Railway target from a manifest

- **WHEN** an operator runs
  `pnpm setup:env:prod --target railway --from
prod-secrets.json` with a manifest that supplies every
  required key
- **THEN** the script writes `.env.prod` with
  `CORS_ORIGIN` and `APP_URL` set to `https://app.resubuild.dev`
  and `PUBLIC_API_URL` and `NEXT_PUBLIC_API_URL` set to
  `https://api.resubuild.dev` (assuming the manifest left the
  four keys empty)
- **AND** the script prints a one-line note to stdout
  reminding the operator to (a) attach the two custom domains
  in the Railway dashboard and (b) enable App Sleeping on
  each service
- **AND** the script does not write a `.env.prod` that mixes
  docker compose placeholders (`http://localhost:*`) with
  Railway custom domains in the four public-URL keys

#### Scenario: Operator supplies manifest values for the four public-URL keys

- **WHEN** an operator's `prod-secrets.json` sets
  `CORS_ORIGIN: "https://my.example.com"` and the script is
  run with `--target railway`
- **THEN** the manifest value wins and the output contains
  `CORS_ORIGIN=https://my.example.com` (not the
  `app.resubuild.dev` default)
- **AND** the other three public-URL keys still default to
  the production custom domains

#### Scenario: Operator omits `--target` and gets the docker compose placeholders

- **WHEN** an operator runs
  `pnpm setup:env:prod --from prod-secrets.json` (no
  `--target` flag, or `--target docker-compose`)
- **THEN** the script writes the same `.env.prod` it would
  have written before this requirement was added — the
  docker compose placeholders are unchanged
- **AND** no Railway reminder is printed
- **AND** no `resubuild.dev` domain appears in the generated
  file

#### Scenario: Manifest declares `DEPLOY_TARGET` explicitly

- **WHEN** an operator's `prod-secrets.json` contains
  `DEPLOY_TARGET: "railway"` and the script is run with
  `--target docker-compose` (or no `--target` flag)
- **THEN** the manifest's `DEPLOY_TARGET` takes precedence
  over the CLI flag and the production custom domains are
  written into the four public-URL keys
- **AND** a one-line warning is printed noting the
  discrepancy between the CLI flag and the manifest
- **AND** a manifest `DEPLOY_TARGET` value that does not
  match any known target causes the script to exit non-zero
  with a one-line error listing the supported targets

### Requirement: The schema module SHALL declare the new `DEPLOY_TARGET` key without breaking the drift test

`scripts/lib/env-prod-schema.mjs` MUST declare the new
optional `DEPLOY_TARGET` key alongside the existing optional
keys. The drift test
(`scripts/lib/env-prod-schema.spec.mjs`) that reads
`apps/api/.env.example` and `apps/web/.env.example` MUST stay
green — `DEPLOY_TARGET` is a generator-internal key, not an
api/web runtime key, so it MUST NOT appear in either
`.env.example` file. The schema MUST validate the
`DEPLOY_TARGET` value against the closed set
`["docker-compose", "railway"]` and reject any other value.

#### Scenario: Operator supplies a bogus `DEPLOY_TARGET` in the manifest

- **WHEN** an operator's `prod-secrets.json` contains
  `DEPLOY_TARGET: "vercel"` and the script is run
- **THEN** the script exits non-zero with a one-line error
  listing the supported targets
- **AND** no file is written to disk

#### Scenario: Schema drift test stays green with the new key

- **WHEN** `pnpm test` runs the schema unit tests after
  `DEPLOY_TARGET` is added to the schema module
- **THEN** the drift test against the two `.env.example`
  files passes
- **AND** the manifest-validation test covers the
  `DEPLOY_TARGET` happy path and the unknown-value
  rejection path
