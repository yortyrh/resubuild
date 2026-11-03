#!/usr/bin/env node
/**
 * Seed the local database and object storage directly — no Nest API required.
 *
 * Creates two accounts:
 *   - developerUser — human-friendly credentials for day-to-day local dev
 *   - e2eUser       — machine credentials; state written for pnpm test:e2e
 *
 * Prerequisites:
 *   1. pnpm infra:up
 *   2. pnpm setup:env
 *
 * Usage:
 *   pnpm samples:seed
 */

import { printLocalCredentials } from './lib/local-credentials.mjs';
import { loadSeedConfig } from './lib/seed-db.mjs';
import { seedFixtures } from './lib/seed-fixtures.mjs';

seedFixtures(loadSeedConfig())
  .then(({ credentials }) => printLocalCredentials(credentials))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
