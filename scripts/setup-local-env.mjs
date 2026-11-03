#!/usr/bin/env node
/**
 * Writes apps/api/.env and apps/web/.env for local development against the
 * Docker infrastructure (`pnpm infra:up`). Re-runnable: feature flags, OAuth
 * credentials and secrets are preserved (see scripts/lib/local-env-composer.mjs).
 *
 * Usage: pnpm setup:env [--dry-run]
 *
 * Environment overrides: PORT (API, default 3001), WEB_ORIGIN (default
 * http://localhost:3000), API_PUBLIC_URL (default http://localhost:$PORT),
 * RESUBUILD_*_PORT (infra host ports, see docker-compose.dev.yml).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { devInfra } from './lib/dev-infra.mjs';
import {
  composeApiEnv,
  composeWebEnv,
  parseDotenv,
  readOperatorValues,
  resolveSecrets,
} from './lib/local-env-composer.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_ENV = path.join(REPO_ROOT, 'apps/api/.env');
const WEB_ENV = path.join(REPO_ROOT, 'apps/web/.env');

const args = new Set(process.argv.slice(2));
if (args.has('-h') || args.has('--help')) {
  console.log('Usage: pnpm setup:env [--dry-run]');
  process.exit(0);
}
const dryRun = args.has('--dry-run');

const readEnv = (file) => (existsSync(file) ? parseDotenv(readFileSync(file, 'utf8')) : {});
const previousApi = readEnv(API_ENV);
const previousWeb = readEnv(WEB_ENV);

const port = process.env.PORT?.trim() || '3001';
const webOrigin = (process.env.WEB_ORIGIN?.trim() || 'http://localhost:3000').replace(/\/$/, '');
const publicApiUrl = (process.env.API_PUBLIC_URL?.trim() || `http://localhost:${port}`).replace(
  /\/$/,
  '',
);
const infra = devInfra();
const operator = readOperatorValues(previousApi, previousWeb);
const { values: secrets, generated } = resolveSecrets(previousApi);

const files = [
  [
    API_ENV,
    composeApiEnv({
      infra,
      port,
      webOrigin,
      publicApiUrl,
      pdfImportMaxBytes: previousApi.PDF_IMPORT_MAX_BYTES || '5242880',
      pdfImportEnabled: previousApi.PDF_IMPORT_ENABLED || 'true',
      operator,
      secrets,
    }),
  ],
  [WEB_ENV, composeWebEnv({ publicApiUrl, mailpitUrl: infra.mailpitUrl, operator })],
];

for (const [file, body] of files) {
  if (dryRun) {
    console.log(`\n--- ${path.relative(REPO_ROOT, file)} ---\n${body}`);
    continue;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, body, 'utf8');
  console.log(`Wrote ${path.relative(REPO_ROOT, file)}`);
}

if (!dryRun) {
  if (generated.length > 0) {
    console.log(`Generated ${generated.join(', ')}.`);
    if (generated.includes('AI_AGENT_ENCRYPTION_KEY') && previousApi.AI_AGENT_ENCRYPTION_KEY) {
      console.log(
        'Rotated AI_AGENT_ENCRYPTION_KEY — re-save AI agent and web scrape keys in settings.',
      );
    }
  }
  console.log(`Local env ready (DATABASE_URL=${infra.databaseUrl}, Mailpit ${infra.mailpitUrl}).`);
  console.log('Next: pnpm samples:seed && pnpm dev');
}
