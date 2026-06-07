/**
 * scripts/lib/railway-config.spec.mjs
 *
 * Unit test for the two `railway.json` service config files that
 * pin the release-1 Railway target's build, start command, and
 * healthcheck. Colocated under `scripts/lib/` per the project rule
 * that unit tests sit beside the tested file.
 *
 * Runs as part of `pnpm test` from the repo root via
 * `vitest run --config vitest.config.mjs` (which includes
 * every `scripts/lib/*.spec.mjs`).
 *
 * See:
 *   - openspec/changes/railway-deployment/specs/railway-deployment/spec.md
 *   - openspec/changes/railway-deployment/specs/monorepo-and-toolchain/spec.md
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(process.cwd());

// The two Railway service config files, one per service.
// Located at the service root directory so Railway's monorepo
// auto-discovery can find them.
const RAILWAY_CONFIG_PATHS = {
  api: 'apps/api/railway.json',
  web: 'apps/web/railway.json',
};

/**
 * @param {string} relPath
 * @returns {Record<string, any>}
 */
function readRailwayConfig(relPath) {
  const abs = resolve(REPO_ROOT, relPath);
  const text = readFileSync(abs, 'utf8');
  return JSON.parse(text);
}

describe('railway.json service config files', () => {
  for (const [service, relPath] of Object.entries(RAILWAY_CONFIG_PATHS)) {
    describe(`${service} service (${relPath})`, () => {
      const config = readRailwayConfig(relPath);

      it('JSON.parse succeeds', () => {
        expect(config).toBeTypeOf('object');
        expect(config).not.toBeNull();
      });

      it('build.builder is "DOCKERFILE"', () => {
        const msg1 = `${relPath}: missing build object`;
        const msg2 = `${relPath}: missing field build.builder`;
        expect(config.build, msg1).toBeTypeOf('object');
        expect(config.build.builder, msg2).toBe('DOCKERFILE');
      });

      it('build.dockerfilePath is non-empty and points inside apps/', () => {
        const value = config.build?.dockerfilePath;
        const msg1 = `${relPath}: missing or empty build.dockerfilePath`;
        const msg2 = `${relPath}: build.dockerfilePath="${value}" must be "Dockerfile" or start with "apps/"`;
        expect(typeof value === 'string' && value.length > 0, msg1).toBe(true);
        // For monorepo services the path is resolved relative to the
        // service root directory (apps/{service}/). Both "Dockerfile"
        // and an "apps/..."-style path are accepted.
        const ok =
          value === 'Dockerfile' ||
          value.startsWith(`apps/${service}/`) ||
          value.startsWith('apps/');
        expect(ok, msg2).toBe(true);
      });

      it('deploy.startCommand is non-empty', () => {
        const value = config.deploy?.startCommand;
        const msg = `${relPath}: missing or empty deploy.startCommand`;
        expect(typeof value === 'string' && value.length > 0, msg).toBe(true);
      });

      it('deploy.healthcheckPath is non-empty and starts with "/"', () => {
        const value = config.deploy?.healthcheckPath;
        const msg1 = `${relPath}: missing or empty deploy.healthcheckPath`;
        const msg2 = `${relPath}: deploy.healthcheckPath="${value}" must start with "/"`;
        expect(typeof value === 'string' && value.length > 0, msg1).toBe(true);
        expect(value.startsWith('/'), msg2).toBe(true);
      });
    });
  }
});

// Path smoke check: assert the build.dockerfilePath in each railway.json
// resolves to a real file in the repo. Prevents silent drift if the
// Dockerfile is renamed or moved.
describe('railway.json dockerfilePath smoke check', () => {
  for (const [service, relPath] of Object.entries(RAILWAY_CONFIG_PATHS)) {
    it(`${service} service dockerfilePath resolves to an existing file`, () => {
      const config = readRailwayConfig(relPath);
      const dockerfilePath = config.build?.dockerfilePath;
      const msg1 = `${relPath}: missing build.dockerfilePath`;
      const msg2 = `${relPath}: build.dockerfilePath="${dockerfilePath}" does not resolve to an existing file`;
      expect(typeof dockerfilePath === 'string' && dockerfilePath.length > 0, msg1).toBe(true);

      // Service root directory is apps/{service}/
      // For dockerfilePath="Dockerfile" we resolve it inside apps/{service}.
      // For an "apps/..." value we resolve it from the repo root.
      const abs = dockerfilePath.startsWith('apps/')
        ? resolve(REPO_ROOT, dockerfilePath)
        : resolve(REPO_ROOT, 'apps', service, dockerfilePath);

      expect(existsSync(abs), `${msg2} (tried ${abs})`).toBe(true);
    });
  }
});
