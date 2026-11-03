import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  account,
  and,
  createDb,
  cv,
  eq,
  media,
  sectionTable,
  user as userTable,
} from '@resubuild/db';
import { hashPassword } from 'better-auth/crypto';
import { REPO_ROOT } from './e2e-fixture-lib.mjs';
import { buildThumbnailBuffer, thumbnailStoragePathFor } from './media-thumbnail.mjs';

/** @type {Record<string, string>} */
export const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * @typedef {object} SeedConfig
 * @property {string} databaseUrl
 * @property {{ endpoint?: string; region: string; accessKeyId: string; secretAccessKey: string; forcePathStyle: boolean }} s3
 * @property {string} mediaBucket
 * @property {string} appUrl
 * @property {string} publicApiUrl
 */

/**
 * @typedef {object} SeedStore
 * @property {import('@resubuild/db').Database} db
 * @property {S3Client} s3
 * @property {string} bucket
 * @property {() => Promise<void>} close
 */

/**
 * Reads seed settings from `process.env`, falling back to `apps/api/.env`
 * (written by `pnpm setup:env`).
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {SeedConfig}
 */
export function loadSeedConfig(env = process.env) {
  loadEnvFile(path.join(REPO_ROOT, 'apps/api/.env'), env);

  const databaseUrl = env.DATABASE_URL?.trim();
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim();

  const missing = [];
  if (!databaseUrl) missing.push('DATABASE_URL');
  if (!accessKeyId) missing.push('S3_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('S3_SECRET_ACCESS_KEY');
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(', ')}. Run: pnpm infra:up && pnpm setup:env`);
  }

  const endpoint = env.S3_ENDPOINT?.trim() || undefined;
  const pathStyle = env.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
  const port = env.PORT ?? '3001';
  const appUrl = (env.APP_URL ?? env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  const publicApiUrl = (env.PUBLIC_API_URL ?? `http://localhost:${port}`).replace(/\/$/, '');

  return {
    databaseUrl,
    s3: {
      endpoint,
      region: env.S3_REGION?.trim() || 'us-east-1',
      accessKeyId,
      secretAccessKey,
      forcePathStyle: pathStyle ? ['1', 'true', 'yes'].includes(pathStyle) : Boolean(endpoint),
    },
    mediaBucket: env.MEDIA_BUCKET?.trim() || 'media',
    appUrl,
    publicApiUrl,
  };
}

/**
 * @param {string} filePath
 * @param {NodeJS.ProcessEnv} env
 */
function loadEnvFile(filePath, env) {
  if (!existsSync(filePath)) {
    return;
  }
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in env)) {
      env[key] = value;
    }
  }
}

/**
 * @param {SeedConfig} config
 * @returns {SeedStore}
 */
export function openSeedStore(config) {
  const handle = createDb({ url: config.databaseUrl, max: 2 });
  const s3 = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    forcePathStyle: config.s3.forcePathStyle,
    credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return {
    db: handle.db,
    s3,
    bucket: config.mediaBucket,
    close: async () => {
      s3.destroy();
      await handle.close();
    },
  };
}

/**
 * Creates (or resets the password of) a verified email/password user.
 *
 * @param {SeedStore} store
 * @param {{ email: string; password: string }} credentials
 * @returns {Promise<{ user: { id: string; email: string }; mode: 'created' | 'existing' }>}
 */
export async function ensureDeveloperUser(store, credentials) {
  const email = credentials.email.toLowerCase();
  const passwordHash = await hashPassword(credentials.password);

  return store.db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    let userId = existing?.id;
    if (!userId) {
      const [created] = await tx
        .insert(userTable)
        .values({ name: email.split('@')[0], email, emailVerified: true })
        .returning({ id: userTable.id });
      userId = created.id;
    } else {
      await tx.update(userTable).set({ emailVerified: true }).where(eq(userTable.id, userId));
    }

    const [credential] = await tx
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
      .limit(1);

    if (credential) {
      await tx.update(account).set({ password: passwordHash }).where(eq(account.id, credential.id));
    } else {
      await tx.insert(account).values({
        userId,
        accountId: userId,
        providerId: 'credential',
        password: passwordHash,
      });
    }

    return { user: { id: userId, email }, mode: existing ? 'existing' : 'created' };
  });
}

/**
 * Removes the user's media (rows + objects) and CVs (sections cascade).
 *
 * @param {SeedStore} store
 * @param {string} userId
 */
export async function clearUserSeedData(store, userId) {
  const rows = await store.db
    .select({
      storage_path: media.storage_path,
      cropped_storage_path: media.cropped_storage_path,
      thumbnail_storage_path: media.thumbnail_storage_path,
    })
    .from(media)
    .where(eq(media.user_id, userId));

  const keys = rows.flatMap((row) =>
    [row.storage_path, row.cropped_storage_path, row.thumbnail_storage_path].filter(Boolean),
  );

  for (let i = 0; i < keys.length; i += 1000) {
    await store.s3.send(
      new DeleteObjectsCommand({
        Bucket: store.bucket,
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }

  await store.db.delete(media).where(eq(media.user_id, userId));
  await store.db.delete(cv).where(eq(cv.user_id, userId));
}

export function deriveCvTitleFromBasics(basics) {
  const name = basics?.name?.trim() ?? '';
  const label = basics?.label?.trim() ?? '';
  if (name && label) return `${name} — ${label}`;
  if (name) return name;
  if (label) return label;
  return 'Untitled CV';
}

/**
 * @param {SeedStore} store
 * @param {string} userId
 * @param {Record<string, unknown>} resumeData
 */
export async function insertCv(store, userId, resumeData) {
  const cvId = randomUUID();
  const basics =
    resumeData.basics && typeof resumeData.basics === 'object' ? resumeData.basics : {};
  const title = deriveCvTitleFromBasics(basics);

  const data = await store.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(cv)
      .values({
        id: cvId,
        user_id: userId,
        name: basics.name ?? null,
        label: basics.label ?? null,
        image: basics.image ?? null,
        email: basics.email ?? null,
        phone: basics.phone ?? null,
        url: basics.url ?? null,
        summary: basics.summary ?? null,
        location: basics.location ?? {},
      })
      .returning();
    await insertNormalizedSections(tx, cvId, resumeData);
    return row;
  });

  return { ...data, title };
}

/**
 * @param {import('@resubuild/db').DbExecutor} db
 * @param {string} cvId
 * @param {Record<string, unknown>} dataWithMeta
 */
async function insertNormalizedSections(db, cvId, dataWithMeta) {
  const basics =
    dataWithMeta.basics && typeof dataWithMeta.basics === 'object' ? dataWithMeta.basics : {};

  const profiles = Array.isArray(basics.profiles) ? basics.profiles : [];
  await insertRows(
    db,
    'cv_profile',
    profiles.map((p, i) => ({
      cv_id: cvId,
      sort: i,
      network: p.network ?? null,
      username: p.username ?? null,
      url: p.url ?? null,
    })),
  );

  const dated = [
    ['cv_work', dataWithMeta.work, mapWorkRow],
    ['cv_volunteer', dataWithMeta.volunteer, mapVolunteerRow],
    ['cv_education', dataWithMeta.education, mapEducationRow],
    ['cv_award', dataWithMeta.awards, mapAwardRow],
    ['cv_certificate', dataWithMeta.certificates, mapCertificateRow],
    ['cv_publication', dataWithMeta.publications, mapPublicationRow],
    ['cv_project', dataWithMeta.projects, mapProjectRow],
  ];
  for (const [table, items, mapper] of dated) {
    if (!Array.isArray(items)) continue;
    await insertRows(
      db,
      table,
      items.map((item) => mapper(item, cvId)),
    );
  }

  const sorted = [
    ['cv_skill', dataWithMeta.skills, mapSkillRow],
    ['cv_language', dataWithMeta.languages, mapLanguageRow],
    ['cv_interest', dataWithMeta.interests, mapInterestRow],
    ['cv_reference', dataWithMeta.references, mapReferenceRow],
  ];
  for (const [table, items, mapper] of sorted) {
    if (!Array.isArray(items)) continue;
    await insertRows(
      db,
      table,
      items.map((item, i) => mapper(item, cvId, i)),
    );
  }
}

/**
 * @param {import('@resubuild/db').DbExecutor} db
 * @param {string} table
 * @param {Record<string, unknown>[]} rows
 */
async function insertRows(db, table, rows) {
  if (rows.length === 0) return;
  try {
    await db.insert(sectionTable(table)).values(rows);
  } catch (error) {
    throw new Error(`${table} insert failed: ${error instanceof Error ? error.message : error}`);
  }
}

/** @param {Record<string, unknown>} w @param {string} cvId */
function mapWorkRow(w, cvId) {
  return {
    cv_id: cvId,
    name: w.name ?? null,
    location: w.location ?? null,
    description: w.description ?? null,
    position: w.position ?? null,
    url: w.url ?? null,
    start_date: w.startDate ?? null,
    end_date: w.endDate ?? null,
    summary: w.summary ?? null,
    highlights: Array.isArray(w.highlights) ? w.highlights : [],
  };
}

/** @param {Record<string, unknown>} v @param {string} cvId */
function mapVolunteerRow(v, cvId) {
  return {
    cv_id: cvId,
    organization: v.organization ?? null,
    position: v.position ?? null,
    url: v.url ?? null,
    start_date: v.startDate ?? null,
    end_date: v.endDate ?? null,
    summary: v.summary ?? null,
    highlights: Array.isArray(v.highlights) ? v.highlights : [],
  };
}

/** @param {Record<string, unknown>} e @param {string} cvId */
function mapEducationRow(e, cvId) {
  return {
    cv_id: cvId,
    institution: e.institution ?? null,
    url: e.url ?? null,
    area: e.area ?? null,
    study_type: e.studyType ?? null,
    start_date: e.startDate ?? null,
    end_date: e.endDate ?? null,
    score: e.score ?? null,
    courses: Array.isArray(e.courses) ? e.courses : [],
  };
}

/** @param {Record<string, unknown>} a @param {string} cvId */
function mapAwardRow(a, cvId) {
  return {
    cv_id: cvId,
    title: a.title ?? null,
    date: a.date ?? null,
    awarder: a.awarder ?? null,
    summary: a.summary ?? null,
  };
}

/** @param {Record<string, unknown>} c @param {string} cvId */
function mapCertificateRow(c, cvId) {
  return {
    cv_id: cvId,
    name: c.name ?? null,
    date: c.date ?? null,
    url: c.url ?? null,
    issuer: c.issuer ?? null,
  };
}

/** @param {Record<string, unknown>} p @param {string} cvId */
function mapPublicationRow(p, cvId) {
  return {
    cv_id: cvId,
    name: p.name ?? null,
    publisher: p.publisher ?? null,
    release_date: p.releaseDate ?? null,
    url: p.url ?? null,
    summary: p.summary ?? null,
  };
}

/** @param {Record<string, unknown>} p @param {string} cvId */
function mapProjectRow(p, cvId) {
  return {
    cv_id: cvId,
    name: p.name ?? null,
    description: p.description ?? null,
    start_date: p.startDate ?? null,
    end_date: p.endDate ?? null,
    url: p.url ?? null,
    entity: p.entity ?? null,
    type: p.type ?? null,
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
    keywords: Array.isArray(p.keywords) ? p.keywords : [],
    roles: Array.isArray(p.roles) ? p.roles : [],
  };
}

/** @param {Record<string, unknown>} s @param {string} cvId @param {number} sort */
function mapSkillRow(s, cvId, sort) {
  return {
    cv_id: cvId,
    sort,
    name: s.name ?? null,
    level: s.level ?? null,
    keywords: Array.isArray(s.keywords) ? s.keywords : [],
  };
}

/** @param {Record<string, unknown>} l @param {string} cvId @param {number} sort */
function mapLanguageRow(l, cvId, sort) {
  return {
    cv_id: cvId,
    sort,
    language: l.language ?? null,
    fluency: l.fluency ?? null,
  };
}

/** @param {Record<string, unknown>} i @param {string} cvId @param {number} sort */
function mapInterestRow(i, cvId, sort) {
  return {
    cv_id: cvId,
    sort,
    name: i.name ?? null,
    keywords: Array.isArray(i.keywords) ? i.keywords : [],
  };
}

/** @param {Record<string, unknown>} r @param {string} cvId @param {number} sort */
function mapReferenceRow(r, cvId, sort) {
  return {
    cv_id: cvId,
    sort,
    name: r.name ?? null,
    reference: r.reference ?? null,
  };
}

/**
 * @param {SeedStore} store
 * @param {string} userId
 * @param {string} publicApiUrl
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} contentType
 */
export async function insertMedia(store, userId, publicApiUrl, buffer, fileName, contentType) {
  const ext = MIME_EXTENSIONS[contentType];
  if (!ext) {
    throw new Error(`Unsupported content type for ${fileName}: ${contentType}`);
  }

  const mediaId = randomUUID();
  const storagePath = `${userId}/${mediaId}.${ext}`;

  await store.s3.send(
    new PutObjectCommand({
      Bucket: store.bucket,
      Key: storagePath,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  try {
    await store.db.insert(media).values({
      id: mediaId,
      user_id: userId,
      storage_path: storagePath,
      content_type: contentType,
      size_bytes: buffer.length,
    });
  } catch (error) {
    await store.s3.send(
      new DeleteObjectsCommand({
        Bucket: store.bucket,
        Delete: { Objects: [{ Key: storagePath }] },
      }),
    );
    throw new Error(
      `Media registry insert failed for ${fileName}: ${error instanceof Error ? error.message : error}`,
    );
  }

  return {
    id: mediaId,
    url: `${publicApiUrl}/media/${mediaId}`,
    contentType,
    sourceFile: fileName,
  };
}

/**
 * Generates the ≤150px WebP preview; writes only `thumbnail_storage_path`.
 *
 * @param {SeedStore} store
 * @param {string} mediaId
 */
export async function ensureMediaThumbnail(store, mediaId) {
  const [row] = await store.db.select().from(media).where(eq(media.id, mediaId)).limit(1);
  if (!row?.storage_path) {
    throw new Error(`Media not found for thumbnail: ${mediaId}`);
  }

  const source = await store.s3.send(
    new GetObjectCommand({
      Bucket: store.bucket,
      Key: row.cropped_storage_path || row.storage_path,
    }),
  );
  const sourceBuffer = Buffer.from(await source.Body.transformToByteArray());
  const thumbPath = thumbnailStoragePathFor(row.user_id, mediaId);

  await store.s3.send(
    new PutObjectCommand({
      Bucket: store.bucket,
      Key: thumbPath,
      Body: await buildThumbnailBuffer(sourceBuffer),
      ContentType: 'image/webp',
    }),
  );
  await store.db
    .update(media)
    .set({ thumbnail_storage_path: thumbPath })
    .where(eq(media.id, mediaId));
}

/**
 * @param {SeedStore} store
 * @param {string} cvId
 * @param {string} userId
 * @param {string} imageUrl
 */
export async function assignProfilePhoto(store, cvId, userId, imageUrl) {
  const [updated] = await store.db
    .update(cv)
    .set({ image: imageUrl })
    .where(and(eq(cv.id, cvId), eq(cv.user_id, userId)))
    .returning();

  if (!updated) {
    throw new Error(`Profile photo update failed: CV ${cvId} not found`);
  }

  const title = deriveCvTitleFromBasics({ name: updated.name, label: updated.label });
  return { ...updated, title };
}

/**
 * @param {{ email: string; password: string; appUrl: string; label?: string }} account
 * @param {{ email: string; password: string; appUrl: string; label?: string }} [e2eAccount]
 */
export function printSeedSummary(account, e2eAccount) {
  const line = '═'.repeat(52);
  console.log(`\n${line}`);
  console.log('  Local environment ready — sign in and start developing');
  console.log('');
  console.log('  Developer account (use this day to day)');
  console.log(`    Email:     ${account.email}`);
  console.log(`    Password:  ${account.password}`);
  console.log(`    App:       ${account.appUrl}`);
  if (e2eAccount) {
    console.log('');
    console.log('  E2E test account (for pnpm test:e2e only)');
    console.log(`    Email:     ${e2eAccount.email}`);
    console.log(`    Password:  ${e2eAccount.password}`);
  }
  console.log(line);
}
