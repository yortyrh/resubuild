#!/usr/bin/env node
/**
 * Seed local Supabase directly (Auth, Postgres, Storage) — no Nest API required.
 *
 * Creates two accounts:
 *   - developerUser — human-friendly credentials for day-to-day local dev
 *   - e2eUser         — machine credentials; state written for pnpm test:e2e
 *
 * Prerequisites:
 *   1. supabase start
 *   2. pnpm setup:env
 *
 * Usage:
 *   pnpm samples:seed
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadFixture, mimeForFile, SAMPLES_DIR, STATE_PATH } from './lib/e2e-fixture-lib.mjs';
import { ensureLocalCredentials, printLocalCredentials } from './lib/local-credentials.mjs';
import {
  assignProfilePhoto,
  clearUserSeedData,
  createAdminClient,
  ensureDeveloperUser,
  insertCv,
  insertMedia,
  loadSupabaseSeedConfig,
} from './lib/seed-supabase.mjs';

/**
 * @param {import('./types/e2e-fixture.types.mjs').E2eFixture} fixture
 */
function validateCvProfilePhotoMapping(fixture) {
  for (const resumeFile of fixture.resumes) {
    const mediaFile = fixture.cvProfilePhotos[resumeFile];
    if (!mediaFile) {
      throw new Error(`Missing cvProfilePhotos entry for resume: ${resumeFile}`);
    }
    if (!fixture.media.includes(mediaFile)) {
      throw new Error(`cvProfilePhotos references unknown media file: ${mediaFile}`);
    }
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {import('./lib/seed-supabase.mjs').SupabaseSeedConfig} config
 * @param {import('./types/e2e-fixture.types.mjs').E2eFixture} fixture
 * @param {{ email: string; password: string }} credentials
 * @param {string} label
 * @returns {Promise<import('./types/e2e-fixture.types.mjs').E2eFixtureAccountState>}
 */
async function seedFixtureAccount(admin, config, fixture, credentials, label) {
  validateCvProfilePhotoMapping(fixture);

  const { user, mode } = await ensureDeveloperUser(admin, credentials);
  console.log(`\n[${label}] user ${mode}: ${user.email} (${user.id})`);
  console.log(`[${label}] clearing previous seed data…`);
  await clearUserSeedData(admin, user.id, config.mediaBucket);

  const resumesDir = path.join(SAMPLES_DIR, fixture.resumesDir);
  const mediaDir = path.join(SAMPLES_DIR, fixture.mediaDir);

  /** @type {import('./types/e2e-fixture.types.mjs').E2eFixtureCvState[]} */
  const cvs = [];

  for (const fileName of fixture.resumes) {
    const filePath = path.join(resumesDir, fileName);
    const raw = await readFile(filePath, 'utf8');
    const resumeData = JSON.parse(raw);
    const created = await insertCv(admin, user.id, resumeData, config.appUrl);
    cvs.push({ id: created.id, sourceFile: fileName, title: created.title });
    console.log(`[${label}]   CV    ${fileName} → ${created.id}`);
  }

  /** @type {import('./types/e2e-fixture.types.mjs').E2eFixtureMediaState[]} */
  const media = [];

  for (const fileName of fixture.media) {
    const filePath = path.join(mediaDir, fileName);
    const buffer = await readFile(filePath);
    const contentType = mimeForFile(fileName);
    const uploaded = await insertMedia(
      admin,
      user.id,
      config.mediaBucket,
      config.publicApiUrl,
      buffer,
      fileName,
      contentType,
    );
    media.push({
      id: uploaded.id,
      url: uploaded.url,
      sourceFile: fileName,
      contentType: uploaded.contentType,
    });
    console.log(`[${label}]   Media ${fileName} → ${uploaded.id}`);
  }

  const mediaBySource = new Map(media.map((item) => [item.sourceFile, item]));

  /** @type {import('./types/e2e-fixture.types.mjs').E2eFixtureProfilePhotoAssignment[]} */
  const profilePhotoAssignments = [];

  for (const cv of cvs) {
    const mediaFile = fixture.cvProfilePhotos[cv.sourceFile];
    const targetMedia = mediaBySource.get(mediaFile);
    if (!targetMedia) {
      throw new Error(`Media not uploaded for ${cv.sourceFile}: ${mediaFile}`);
    }

    await assignProfilePhoto(admin, cv.id, user.id, targetMedia.url, config.appUrl);
    profilePhotoAssignments.push({
      cvId: cv.id,
      cvSourceFile: cv.sourceFile,
      mediaId: targetMedia.id,
      mediaUrl: targetMedia.url,
      mediaSourceFile: targetMedia.sourceFile,
    });
    console.log(`[${label}]   Photo ${targetMedia.sourceFile} → ${cv.sourceFile}`);
  }

  return {
    user: { id: user.id, email: user.email ?? credentials.email },
    cvs,
    media,
    profilePhotoAssignments,
  };
}

async function main() {
  const config = loadSupabaseSeedConfig();
  const admin = createAdminClient(config);
  const fixture = await loadFixture();
  const credentials = await ensureLocalCredentials(fixture, config.appUrl);

  await seedFixtureAccount(admin, config, fixture, credentials.developerUser, 'developer');

  const e2eAccount = await seedFixtureAccount(admin, config, fixture, credentials.e2eUser, 'e2e');

  /** @type {import('./types/e2e-fixture.types.mjs').E2eFixtureState} */
  const state = {
    version: fixture.version,
    seededAt: new Date().toISOString(),
    apiBaseUrl: config.publicApiUrl,
    e2e: e2eAccount,
  };

  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${STATE_PATH} (e2e account ids for pnpm test:e2e)`);
  console.log(
    `Seeded ${fixture.resumes.length} CV(s) with profile photos and ${fixture.media.length} media file(s) per account.`,
  );

  printLocalCredentials(credentials);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
