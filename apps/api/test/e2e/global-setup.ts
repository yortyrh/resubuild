import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../../..');
const apiEnvPath = path.join(repoRoot, 'apps/api/.env');
const statePath = path.join(repoRoot, '.samples/e2e-fixture.state.json');

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }
  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export default async function globalSetup() {
  loadEnvFile(apiEnvPath);

  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'MEDIA_BUCKET',
  ];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `E2E requires local Supabase env in apps/api/.env (missing: ${missing.join(', ')}). Run: supabase start && pnpm setup:env`,
    );
  }

  if (!existsSync(statePath)) {
    throw new Error(`E2E fixture state not found at ${statePath}. Run: pnpm samples:seed`);
  }

  const credentialsPath = path.join(repoRoot, '.samples/local-credentials.json');
  if (!existsSync(credentialsPath)) {
    throw new Error(`Local credentials not found at ${credentialsPath}. Run: pnpm samples:seed`);
  }
}
