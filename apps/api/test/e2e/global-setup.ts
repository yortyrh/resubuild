import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { startE2eInfra } from './infra';

const repoRoot = path.resolve(__dirname, '../../../..');

interface SeedDbModule {
  loadSeedConfig: (env: NodeJS.ProcessEnv) => unknown;
}
interface SeedFixturesModule {
  seedFixtures: (config: unknown, options: { log: (line: string) => void }) => Promise<unknown>;
}

/** Shared with global-teardown.ts (same process). */
declare global {
  // eslint-disable-next-line no-var
  var __E2E_STOP_INFRA__: (() => Promise<void>) | undefined;
}

/**
 * Self-contained e2e environment: needs only Docker (or Podman).
 *
 * Starts Postgres/S3/Mailpit containers, points the API env at them, seeds the
 * fixture accounts with the same code as `pnpm samples:seed`, and leaves the
 * containers running until global-teardown.ts.
 */
/**
 * Podman's Docker-compatible API cannot stream Ryuk's startup logs, so the
 * reaper never reports ready. Skip it there; global-teardown stops the
 * containers anyway. Override with TESTCONTAINERS_RYUK_DISABLED explicitly.
 */
function disableRyukOnPodman(): void {
  if (process.env.TESTCONTAINERS_RYUK_DISABLED !== undefined) return;
  const socket = process.env.DOCKER_HOST?.replace(/^unix:\/\//, '') ?? '/var/run/docker.sock';
  try {
    if (existsSync(socket) && realpathSync(socket).includes('podman')) {
      process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
    }
  } catch {
    // Not a local socket (remote Docker host): keep Ryuk.
  }
}

export default async function globalSetup() {
  disableRyukOnPodman();
  const infra = await startE2eInfra();
  globalThis.__E2E_STOP_INFRA__ = infra.stop;

  Object.assign(process.env, infra.env, {
    NODE_ENV: 'test',
    PORT: '3001',
    APP_URL: 'http://localhost:3000',
    WEB_URL: 'http://localhost:3000',
    CORS_ORIGIN: 'http://localhost:3000',
    PUBLIC_API_URL: 'http://localhost:3001',
    BETTER_AUTH_URL: 'http://localhost:3001',
    BETTER_AUTH_SECRET: 'e2e-better-auth-secret-at-least-32-characters',
    MCP_KEY_PEPPER: 'e2e-mcp-pepper',
    AI_AGENT_ENCRYPTION_KEY: 'e2e-ai-agent-encryption-key-32-characters!',
    AUTH_FORGOT_PASSWORD_ENABLED: 'true',
    AUTH_EMAIL_VERIFICATION_ENABLED: 'true',
    AUTH_PASSWORDLESS_ENABLED: 'true',
    IMPORT_MODELS_CATALOG_SOURCE: 'static',
  });

  // Seed with the same code as `pnpm samples:seed` (plain ESM in scripts/).
  const importScript = (relative: string) => import(path.join(repoRoot, relative));
  const seedDb = (await importScript('scripts/lib/seed-db.mjs')) as SeedDbModule;
  const seedFixtures = (await importScript('scripts/lib/seed-fixtures.mjs')) as SeedFixturesModule;

  await seedFixtures.seedFixtures(seedDb.loadSeedConfig(process.env), { log: () => undefined });
}
