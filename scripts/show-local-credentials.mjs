#!/usr/bin/env node
/**
 * Print local developer and E2E credentials for this machine.
 * Run after `pnpm samples:seed`, or anytime to recover login details.
 */

import { loadLocalCredentials, printLocalCredentials } from './lib/local-credentials.mjs';

async function main() {
  const credentials = await loadLocalCredentials();
  if (!credentials) {
    console.error(
      'No local credentials found. Run: supabase start && pnpm setup:env && pnpm samples:seed',
    );
    process.exit(1);
  }
  printLocalCredentials(credentials);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
