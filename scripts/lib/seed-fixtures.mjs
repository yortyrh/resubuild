import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadFixture, mimeForFile, SAMPLES_DIR, STATE_PATH } from './e2e-fixture-lib.mjs';
import { ensureLocalCredentials } from './local-credentials.mjs';
import {
  assignProfilePhoto,
  clearUserSeedData,
  ensureDeveloperUser,
  ensureMediaThumbnail,
  insertCv,
  insertMedia,
  openSeedStore,
} from './seed-db.mjs';

/**
 * @param {import('../types/e2e-fixture.types.mjs').E2eFixture} fixture
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
 * @param {import('./seed-db.mjs').SeedStore} store
 * @param {import('./seed-db.mjs').SeedConfig} config
 * @param {import('../types/e2e-fixture.types.mjs').E2eFixture} fixture
 * @param {{ email: string; password: string }} credentials
 * @param {string} label
 * @param {(line: string) => void} log
 * @returns {Promise<import('../types/e2e-fixture.types.mjs').E2eFixtureAccountState>}
 */
async function seedFixtureAccount(store, config, fixture, credentials, label, log) {
  validateCvProfilePhotoMapping(fixture);

  const { user, mode } = await ensureDeveloperUser(store, credentials);
  log(`\n[${label}] user ${mode}: ${user.email} (${user.id})`);
  log(`[${label}] clearing previous seed data…`);
  await clearUserSeedData(store, user.id);

  const resumesDir = path.join(SAMPLES_DIR, fixture.resumesDir);
  const mediaDir = path.join(SAMPLES_DIR, fixture.mediaDir);

  /** @type {import('../types/e2e-fixture.types.mjs').E2eFixtureCvState[]} */
  const cvs = [];
  for (const fileName of fixture.resumes) {
    const resumeData = JSON.parse(await readFile(path.join(resumesDir, fileName), 'utf8'));
    const created = await insertCv(store, user.id, resumeData);
    cvs.push({ id: created.id, sourceFile: fileName, title: created.title });
    log(`[${label}]   CV    ${fileName} → ${created.id}`);
  }

  /** @type {import('../types/e2e-fixture.types.mjs').E2eFixtureMediaState[]} */
  const media = [];
  for (const fileName of fixture.media) {
    const buffer = await readFile(path.join(mediaDir, fileName));
    const uploaded = await insertMedia(
      store,
      user.id,
      config.publicApiUrl,
      buffer,
      fileName,
      mimeForFile(fileName),
    );
    media.push({
      id: uploaded.id,
      url: uploaded.url,
      sourceFile: fileName,
      contentType: uploaded.contentType,
    });
    log(`[${label}]   Media ${fileName} → ${uploaded.id}`);
  }

  const mediaBySource = new Map(media.map((item) => [item.sourceFile, item]));

  /** @type {import('../types/e2e-fixture.types.mjs').E2eFixtureProfilePhotoAssignment[]} */
  const profilePhotoAssignments = [];
  for (const cv of cvs) {
    const mediaFile = fixture.cvProfilePhotos[cv.sourceFile];
    const targetMedia = mediaBySource.get(mediaFile);
    if (!targetMedia) {
      throw new Error(`Media not uploaded for ${cv.sourceFile}: ${mediaFile}`);
    }

    await assignProfilePhoto(store, cv.id, user.id, targetMedia.url);
    await ensureMediaThumbnail(store, targetMedia.id);
    profilePhotoAssignments.push({
      cvId: cv.id,
      cvSourceFile: cv.sourceFile,
      mediaId: targetMedia.id,
      mediaUrl: targetMedia.url,
      mediaSourceFile: targetMedia.sourceFile,
    });
    log(`[${label}]   Photo ${targetMedia.sourceFile} → ${cv.sourceFile}`);
  }

  return { user: { id: user.id, email: user.email }, cvs, media, profilePhotoAssignments };
}

/**
 * Seeds the developer and e2e accounts (users, CVs, media, profile photos)
 * straight into Postgres + object storage and writes the e2e state file.
 * Used by `pnpm samples:seed` and the e2e global setup.
 *
 * @param {import('./seed-db.mjs').SeedConfig} config
 * @param {{ log?: (line: string) => void }} [options]
 */
export async function seedFixtures(config, { log = console.log } = {}) {
  const store = openSeedStore(config);
  try {
    const fixture = await loadFixture();
    const credentials = await ensureLocalCredentials(fixture, config.appUrl);

    await seedFixtureAccount(store, config, fixture, credentials.developerUser, 'developer', log);
    const e2eAccount = await seedFixtureAccount(
      store,
      config,
      fixture,
      credentials.e2eUser,
      'e2e',
      log,
    );

    /** @type {import('../types/e2e-fixture.types.mjs').E2eFixtureState} */
    const state = {
      version: fixture.version,
      seededAt: new Date().toISOString(),
      apiBaseUrl: config.publicApiUrl,
      e2e: e2eAccount,
    };
    await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    log(`\nWrote ${STATE_PATH} (e2e account ids for pnpm test:e2e)`);
    log(
      `Seeded ${fixture.resumes.length} CV(s) with profile photos and ${fixture.media.length} media file(s) per account.`,
    );

    return { state, credentials };
  } finally {
    await store.close();
  }
}
