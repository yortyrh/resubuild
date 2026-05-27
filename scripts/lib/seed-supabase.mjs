import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { REPO_ROOT } from './e2e-fixture-lib.mjs';

/** @type {Record<string, string>} */
export const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * @typedef {object} SupabaseSeedConfig
 * @property {string} supabaseUrl
 * @property {string} serviceRoleKey
 * @property {string} mediaBucket
 * @property {string} appUrl
 * @property {string} publicApiUrl
 */

/**
 * @returns {SupabaseSeedConfig}
 */
export function loadSupabaseSeedConfig() {
  loadEnvFile(path.join(REPO_ROOT, 'apps/api/.env'));
  loadEnvFromSupabaseStatus();

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  let mediaBucket = process.env.MEDIA_BUCKET?.trim();

  if (!mediaBucket) {
    const configToml = path.join(REPO_ROOT, 'supabase/config.toml');
    if (existsSync(configToml)) {
      const match = readFileSync(configToml, 'utf8').match(/^\[storage\.buckets\.([^\]]+)\]/m);
      mediaBucket = match?.[1];
    }
  }
  mediaBucket = mediaBucket || 'media';

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(', ')}. Run: supabase start && pnpm setup:env`);
  }

  const port = process.env.PORT ?? '3001';
  const appUrl = (
    process.env.APP_URL ??
    process.env.CORS_ORIGIN?.split(',')[0] ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
  const publicApiUrl = (process.env.PUBLIC_API_URL ?? `http://localhost:${port}`).replace(
    /\/$/,
    '',
  );

  return { supabaseUrl, serviceRoleKey, mediaBucket, appUrl, publicApiUrl };
}

/**
 * @param {string} filePath
 */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function loadEnvFromSupabaseStatus() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  try {
    const output = execSync('supabase status -o env 2>/dev/null', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    for (const line of output.split('\n')) {
      const match = line.match(/^([A-Z_]+)="(.*)"$/);
      if (!match) continue;
      const [, key, value] = match;
      if (key === 'API_URL' && !process.env.SUPABASE_URL) {
        process.env.SUPABASE_URL = value;
      }
      if (key === 'SERVICE_ROLE_KEY' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = value;
      }
    }
  } catch {
    // supabase CLI not running — apps/api/.env must be present
  }
}

/**
 * @param {SupabaseSeedConfig} config
 */
export function createAdminClient(config) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} email
 */
async function findUserByEmail(admin, email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((user) => user.email === email);
    if (found) return found;
    if (data.users.length < 100) break;
    page += 1;
  }
  return null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ email: string; password: string }} user
 */
export async function ensureDeveloperUser(admin, user) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  if (!createError && created.user) {
    return { user: created.user, mode: 'created' };
  }

  const existing = await findUserByEmail(admin, user.email);
  if (!existing) {
    throw new Error(
      createError?.message ?? `Could not create or find developer user ${user.email}`,
    );
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password: user.password,
    email_confirm: true,
  });
  if (updateError) {
    throw new Error(`Could not reset password for ${user.email}: ${updateError.message}`);
  }

  return { user: existing, mode: 'existing' };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {string} bucket
 */
export async function clearUserSeedData(admin, userId, bucket) {
  const { data: mediaRows, error: mediaSelectError } = await admin
    .from('media')
    .select('storage_path, cropped_storage_path')
    .eq('user_id', userId);

  if (mediaSelectError) {
    throw new Error(`Failed to list media for cleanup: ${mediaSelectError.message}`);
  }

  const storagePaths = [];
  for (const row of mediaRows ?? []) {
    if (row.storage_path) storagePaths.push(row.storage_path);
    if (row.cropped_storage_path) storagePaths.push(row.cropped_storage_path);
  }

  if (storagePaths.length > 0) {
    const { error: storageError } = await admin.storage.from(bucket).remove(storagePaths);
    if (storageError) {
      throw new Error(`Failed to remove storage objects: ${storageError.message}`);
    }
  }

  const { error: mediaDeleteError } = await admin.from('media').delete().eq('user_id', userId);
  if (mediaDeleteError) {
    throw new Error(`Failed to delete media rows: ${mediaDeleteError.message}`);
  }

  const { error: cvDeleteError } = await admin.from('cv').delete().eq('user_id', userId);
  if (cvDeleteError) {
    throw new Error(`Failed to delete CV rows: ${cvDeleteError.message}`);
  }
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
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {Record<string, unknown>} resumeData
 * @param {string} _appUrl
 */
export async function insertCv(admin, userId, resumeData, _appUrl) {
  const cvId = randomUUID();
  const basics =
    resumeData.basics && typeof resumeData.basics === 'object' ? resumeData.basics : {};
  const title = deriveCvTitleFromBasics(basics);

  const { data, error } = await admin
    .from('cv')
    .insert({
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
    .select('*')
    .single();

  if (error) {
    throw new Error(`CV insert failed: ${error.message}`);
  }

  await insertNormalizedSections(admin, cvId, resumeData);

  return { ...data, title };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} cvId
 * @param {Record<string, unknown>} dataWithMeta
 */
async function insertNormalizedSections(admin, cvId, dataWithMeta) {
  const basics =
    dataWithMeta.basics && typeof dataWithMeta.basics === 'object' ? dataWithMeta.basics : {};

  const profiles = Array.isArray(basics.profiles) ? basics.profiles : [];
  if (profiles.length > 0) {
    const { error } = await admin.from('cv_profile').insert(
      profiles.map((p, i) => ({
        cv_id: cvId,
        sort: i,
        network: p.network ?? null,
        username: p.username ?? null,
        url: p.url ?? null,
      })),
    );
    if (error) throw new Error(`cv_profile insert failed: ${error.message}`);
  }

  await insertDateSection(admin, cvId, 'cv_work', dataWithMeta.work, mapWorkRow);
  await insertDateSection(admin, cvId, 'cv_volunteer', dataWithMeta.volunteer, mapVolunteerRow);
  await insertDateSection(admin, cvId, 'cv_education', dataWithMeta.education, mapEducationRow);
  await insertDateSection(admin, cvId, 'cv_award', dataWithMeta.awards, mapAwardRow);
  await insertDateSection(
    admin,
    cvId,
    'cv_certificate',
    dataWithMeta.certificates,
    mapCertificateRow,
  );
  await insertDateSection(
    admin,
    cvId,
    'cv_publication',
    dataWithMeta.publications,
    mapPublicationRow,
  );
  await insertDateSection(admin, cvId, 'cv_project', dataWithMeta.projects, mapProjectRow);

  await insertSortSection(admin, cvId, 'cv_skill', dataWithMeta.skills, mapSkillRow);
  await insertSortSection(admin, cvId, 'cv_language', dataWithMeta.languages, mapLanguageRow);
  await insertSortSection(admin, cvId, 'cv_interest', dataWithMeta.interests, mapInterestRow);
  await insertSortSection(admin, cvId, 'cv_reference', dataWithMeta.references, mapReferenceRow);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} cvId
 * @param {string} table
 * @param {unknown} items
 * @param {(item: Record<string, unknown>, cvId: string) => Record<string, unknown>} mapper
 */
async function insertDateSection(admin, cvId, table, items, mapper) {
  if (!Array.isArray(items) || items.length === 0) return;
  const rows = items.map((item) => mapper(item, cvId));
  const { error } = await admin.from(table).insert(rows);
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} cvId
 * @param {string} table
 * @param {unknown} items
 * @param {(item: Record<string, unknown>, cvId: string, sort: number) => Record<string, unknown>} mapper
 */
async function insertSortSection(admin, cvId, table, items, mapper) {
  if (!Array.isArray(items) || items.length === 0) return;
  const rows = items.map((item, i) => mapper(item, cvId, i));
  const { error } = await admin.from(table).insert(rows);
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
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
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {string} bucket
 * @param {string} publicApiUrl
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} contentType
 */
export async function insertMedia(
  admin,
  userId,
  bucket,
  publicApiUrl,
  buffer,
  fileName,
  contentType,
) {
  const ext = MIME_EXTENSIONS[contentType];
  if (!ext) {
    throw new Error(`Unsupported content type for ${fileName}: ${contentType}`);
  }

  const mediaId = randomUUID();
  const storagePath = `${userId}/${mediaId}.${ext}`;

  const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`Storage upload failed for ${fileName}: ${uploadError.message}`);
  }

  const { error: dbError } = await admin.from('media').insert({
    id: mediaId,
    user_id: userId,
    storage_path: storagePath,
    content_type: contentType,
    size_bytes: buffer.length,
  });

  if (dbError) {
    await admin.storage.from(bucket).remove([storagePath]);
    throw new Error(`Media registry insert failed for ${fileName}: ${dbError.message}`);
  }

  return {
    id: mediaId,
    url: `${publicApiUrl}/media/${mediaId}`,
    contentType,
    sourceFile: fileName,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} cvId
 * @param {string} userId
 * @param {Record<string, unknown>} data
 * @param {string} imageUrl
 * @param {string} appUrl
 */
/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} cvId
 * @param {string} userId
 * @param {string} imageUrl
 * @param {string} appUrl
 */
export async function assignProfilePhoto(admin, cvId, userId, imageUrl, _appUrl) {
  const { data: updated, error } = await admin
    .from('cv')
    .update({
      image: imageUrl,
    })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Profile photo update failed: ${error.message}`);
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

/** @deprecated use printSeedSummary */
export function printDeveloperCredentials(details) {
  printSeedSummary(details);
}
