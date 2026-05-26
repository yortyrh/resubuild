import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SAMPLES_DIR } from './e2e-fixture-lib.mjs';

export const LOCAL_CREDENTIALS_PATH = path.join(SAMPLES_DIR, 'local-credentials.json');

/**
 * @typedef {object} LocalCredentialUser
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {object} LocalCredentials
 * @property {string} generatedAt
 * @property {string} appUrl
 * @property {LocalCredentialUser} developerUser
 * @property {LocalCredentialUser} e2eUser
 */

/** Generates a unique strong password for this machine (≥20 chars, mixed classes). */
export function generateLocalPassword() {
  const base = randomBytes(18).toString('base64url');
  return `Rm-${base}-7x`;
}

/**
 * @param {{ developerUser: { email: string }; e2eUser: { email: string } }} fixture
 * @param {string} appUrl
 * @returns {Promise<LocalCredentials>}
 */
export async function ensureLocalCredentials(fixture, appUrl) {
  const existing = await loadLocalCredentials();
  if (existing) {
    return existing;
  }

  /** @type {LocalCredentials} */
  const credentials = {
    generatedAt: new Date().toISOString(),
    appUrl,
    developerUser: {
      email: fixture.developerUser.email,
      password: generateLocalPassword(),
    },
    e2eUser: {
      email: fixture.e2eUser.email,
      password: generateLocalPassword(),
    },
  };

  await writeFile(LOCAL_CREDENTIALS_PATH, `${JSON.stringify(credentials, null, 2)}\n`, 'utf8');
  return credentials;
}

/**
 * @returns {Promise<LocalCredentials | null>}
 */
export async function loadLocalCredentials() {
  if (!existsSync(LOCAL_CREDENTIALS_PATH)) {
    return null;
  }
  const raw = await readFile(LOCAL_CREDENTIALS_PATH, 'utf8');
  return JSON.parse(raw);
}

/**
 * @param {LocalCredentials} credentials
 */
export function printLocalCredentials(credentials) {
  const line = '═'.repeat(52);
  console.log(line);
  console.log('  Local environment credentials (this machine only)');
  console.log('');
  console.log('  Developer account — use for day-to-day dev');
  console.log(`    Email:     ${credentials.developerUser.email}`);
  console.log(`    Password:  ${credentials.developerUser.password}`);
  console.log(`    App:       ${credentials.appUrl}`);
  console.log('');
  console.log('  E2E test account — for pnpm test:e2e only');
  console.log(`    Email:     ${credentials.e2eUser.email}`);
  console.log(`    Password:  ${credentials.e2eUser.password}`);
  console.log('');
  console.log(`  Stored in: ${LOCAL_CREDENTIALS_PATH}`);
  console.log(line);
}
