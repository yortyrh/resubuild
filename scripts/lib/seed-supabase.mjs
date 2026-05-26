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
 * @param {string} baseUrl
 * @param {string} cvId
 */
function buildResumeCanonicalUrl(baseUrl, cvId) {
  return `${baseUrl.replace(/\/$/, '')}/dashboard/cv/${cvId}`;
}

/**
 * @param {Record<string, unknown>} data
 * @param {{ cvId: string; baseUrl: string }} options
 */
export function applyResumeMetaForCreate(data, options) {
  const now = new Date().toISOString().slice(0, 19);
  return {
    ...data,
    meta: {
      canonical: buildResumeCanonicalUrl(options.baseUrl, options.cvId),
      version: 'v1.0.0',
      lastModified: now,
    },
  };
}

/**
 * @param {string} version
 */
function bumpResumeMetaVersion(version) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/i);
  if (match) {
    const patch = Number.parseInt(match[3], 10) + 1;
    return `v${match[1]}.${match[2]}.${patch}`;
  }
  return 'v1.0.1';
}

/**
 * @param {Record<string, unknown>} data
 * @param {{ cvId: string; baseUrl: string; currentVersion?: string }} options
 */
export function applyResumeMetaForUpdate(data, options) {
  const now = new Date().toISOString().slice(0, 19);
  const baseVersion = options.currentVersion ?? 'v1.0.0';
  return {
    ...data,
    meta: {
      canonical: buildResumeCanonicalUrl(options.baseUrl, options.cvId),
      version: bumpResumeMetaVersion(baseVersion),
      lastModified: now,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {Record<string, unknown>} resumeData
 * @param {string} appUrl
 */
export async function insertCv(admin, userId, resumeData, appUrl) {
  const cvId = randomUUID();
  const dataWithMeta = applyResumeMetaForCreate(resumeData, { cvId, baseUrl: appUrl });
  const basics = dataWithMeta.basics;
  const title =
    basics && typeof basics === 'object'
      ? deriveCvTitleFromBasics(basics)
      : deriveCvTitleFromBasics(undefined);

  const { data, error } = await admin
    .from('cv')
    .insert({
      id: cvId,
      user_id: userId,
      title,
      data: dataWithMeta,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`CV insert failed: ${error.message}`);
  }

  return data;
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
export async function assignProfilePhoto(admin, cvId, userId, data, imageUrl, appUrl) {
  const nextData = structuredClone(data);
  if (!nextData.basics || typeof nextData.basics !== 'object') {
    nextData.basics = {};
  }
  nextData.basics.image = imageUrl;

  const currentVersion =
    nextData.meta && typeof nextData.meta === 'object' && 'version' in nextData.meta
      ? String(nextData.meta.version)
      : undefined;

  const dataWithMeta = applyResumeMetaForUpdate(nextData, {
    cvId,
    baseUrl: appUrl,
    currentVersion,
  });

  const title = deriveCvTitleFromBasics(
    dataWithMeta.basics && typeof dataWithMeta.basics === 'object'
      ? dataWithMeta.basics
      : undefined,
  );

  const { data: row, error } = await admin
    .from('cv')
    .update({ data: dataWithMeta, title })
    .eq('id', cvId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Profile photo update failed: ${error.message}`);
  }

  return row;
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
