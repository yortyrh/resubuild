#!/usr/bin/env node
/**
 * One-off migration of a Supabase project into the plain Postgres + S3 setup.
 *
 *   1. auth.users      → public."user"   (same UUIDs, email, verified flag, name, avatar)
 *      encrypted_password → account (providerId 'credential'; bcrypt kept, upgraded on sign-in)
 *      auth.identities → account (github, google, linkedin_oidc → linkedin)
 *   2. public.* application tables, in foreign-key order
 *   3. objects of the media and MCP export buckets (same keys)
 *   4. row/object counts compared between source and target
 *
 * Idempotent: rows that already exist (same primary key) and objects that
 * already exist are skipped, so it can be re-run after a partial failure.
 * The target schema must exist first (`pnpm db:migrate` with DATABASE_URL).
 *
 * Usage:
 *   node scripts/migrate-from-supabase.mjs [--dry-run] [--skip-storage]
 *
 * Environment:
 *   SOURCE_DATABASE_URL        Supabase Postgres (direct or session pooler, role postgres)
 *   DATABASE_URL               Target Postgres
 *   SOURCE_S3_ENDPOINT         https://<project-ref>.supabase.co/storage/v1/s3
 *   SOURCE_S3_REGION           Supabase project region (e.g. us-east-1)
 *   SOURCE_S3_ACCESS_KEY_ID    Supabase Storage S3 access key (Project Settings → Storage)
 *   SOURCE_S3_SECRET_ACCESS_KEY
 *   S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE
 *                              Target storage (same variables as the API)
 *   MEDIA_BUCKET, MCP_EXPORT_BUCKET  Bucket names (default media, mcp-exports; same on both sides)
 *
 * After migrating: set MCP_KEY_PEPPER to the old SUPABASE_SERVICE_ROLE_KEY if the
 * Supabase deployment ran without MCP_KEY_PEPPER, otherwise existing MCP keys stop
 * working. Active sessions are not migrated: everyone signs in again.
 */
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import pg from 'pg';
import {
  APP_TABLES,
  mapAuthUser,
  mapCredentialAccount,
  mapIdentityAccount,
} from './lib/supabase-migration.mjs';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const SKIP_STORAGE = args.has('--skip-storage');
const BATCH = 500;

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`error: ${name} is required (see the header of this script)`);
    process.exit(1);
  }
  return value;
}

const log = (...parts) => console.log(...parts);

/** Inserts rows with ON CONFLICT DO NOTHING; returns how many were new. */
async function insertRows(target, table, rows, { columns, jsonbColumns, conflictKey }) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const values = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        const value = row[column];
        values.push(
          jsonbColumns.has(column) && value !== null && value !== undefined
            ? JSON.stringify(value)
            : (value ?? null),
        );
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    const sql = `insert into public."${table}" (${columns.map((c) => `"${c}"`).join(', ')})
      values ${tuples.join(', ')}
      on conflict (${conflictKey.map((c) => `"${c}"`).join(', ')}) do nothing`;
    const result = await target.query(sql, values);
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

async function columnsOf(client, table) {
  const { rows } = await client.query(
    `select column_name, data_type from information_schema.columns
     where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table],
  );
  return rows;
}

async function migrateUsers(source, target) {
  const { rows: authUsers } = await source.query(
    `select id, email, email_confirmed_at, raw_user_meta_data, encrypted_password, created_at, updated_at
     from auth.users where deleted_at is null`,
  );
  const users = authUsers.map(mapAuthUser).filter(Boolean);
  const skipped = authUsers.length - users.length;
  const userIds = users.map((u) => u.id);

  const credentials = authUsers
    .filter((u) => userIds.includes(u.id))
    .map(mapCredentialAccount)
    .filter(Boolean);

  const { rows: identities } = await source.query(
    `select user_id, provider, provider_id, identity_data, created_at from auth.identities`,
  );
  const oauthAccounts = identities
    .filter((i) => userIds.includes(i.user_id))
    .map(mapIdentityAccount)
    .filter(Boolean);

  log(
    `users: ${users.length} with email (${skipped} skipped without email), ` +
      `${credentials.length} password credentials, ${oauthAccounts.length} OAuth accounts`,
  );
  if (DRY_RUN) return userIds;

  const insertedUsers = await insertRows(target, 'user', users, {
    columns: ['id', 'name', 'email', 'email_verified', 'image', 'created_at', 'updated_at'],
    jsonbColumns: new Set(),
    conflictKey: ['id'],
  });

  // account has no natural unique key; skip (user, provider) pairs already present.
  const { rows: existing } = await target.query(`select user_id, provider_id from public.account`);
  const have = new Set(existing.map((r) => `${r.user_id}:${r.provider_id}`));
  const accounts = [...credentials, ...oauthAccounts].filter(
    (a) => !have.has(`${a.user_id}:${a.provider_id}`),
  );
  let insertedAccounts = 0;
  for (const accountRow of accounts) {
    const result = await target.query(
      `insert into public.account (account_id, provider_id, user_id, password, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        accountRow.account_id,
        accountRow.provider_id,
        accountRow.user_id,
        accountRow.password ?? null,
        accountRow.created_at,
        accountRow.updated_at,
      ],
    );
    insertedAccounts += result.rowCount ?? 0;
  }
  log(`  inserted ${insertedUsers} users, ${insertedAccounts} accounts`);
  return userIds;
}

async function migrateTables(source, target, userIds) {
  const report = [];
  for (const table of APP_TABLES) {
    const sourceColumns = await columnsOf(source, table.name);
    const targetColumns = await columnsOf(target, table.name);
    const targetNames = new Set(targetColumns.map((c) => c.column_name));
    const columns = sourceColumns.map((c) => c.column_name).filter((c) => targetNames.has(c));
    const jsonbColumns = new Set(
      targetColumns.filter((c) => c.data_type === 'jsonb').map((c) => c.column_name),
    );

    const ownership = sourceColumns.some((c) => c.column_name === 'user_id')
      ? 'user_id = any($1)'
      : 'cv_id in (select id from public.cv where user_id = any($1))';
    const { rows } = await source.query(
      `select ${columns.map((c) => `"${c}"`).join(', ')} from public."${table.name}" where ${ownership}`,
      [userIds],
    );

    let inserted = 0;
    if (!DRY_RUN && rows.length > 0) {
      const firstPass = table.selfRef ? rows.map((r) => ({ ...r, [table.selfRef]: null })) : rows;
      inserted = await insertRows(target, table.name, firstPass, {
        columns,
        jsonbColumns,
        conflictKey: table.key ?? ['id'],
      });
      if (table.selfRef) {
        for (const row of rows.filter((r) => r[table.selfRef])) {
          await target.query(
            `update public."${table.name}" set "${table.selfRef}" = $1
             where id = $2 and "${table.selfRef}" is null`,
            [row[table.selfRef], row.id],
          );
        }
      }
    }
    report.push({ table: table.name, source: rows.length, inserted });
    log(`  ${table.name}: ${rows.length} rows${DRY_RUN ? '' : `, ${inserted} new`}`);
  }
  return report;
}

function s3Client(prefix) {
  const endpoint = process.env[`${prefix}S3_ENDPOINT`]?.trim() || undefined;
  const pathStyle = process.env[`${prefix}S3_FORCE_PATH_STYLE`]?.trim().toLowerCase();
  return new S3Client({
    endpoint,
    region: process.env[`${prefix}S3_REGION`]?.trim() || 'us-east-1',
    forcePathStyle: pathStyle ? pathStyle === 'true' : Boolean(endpoint),
    credentials: {
      accessKeyId: requireEnv(`${prefix}S3_ACCESS_KEY_ID`),
      secretAccessKey: requireEnv(`${prefix}S3_SECRET_ACCESS_KEY`),
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

async function objectExists(s3, bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return false;
    throw error;
  }
}

async function migrateBucket(sourceS3, targetS3, bucket) {
  let listed = 0;
  let copied = 0;
  let token;
  do {
    const page = await sourceS3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const object of page.Contents ?? []) {
      if (!object.Key || object.Key.endsWith('/.emptyFolderPlaceholder')) continue;
      listed++;
      if (DRY_RUN || (await objectExists(targetS3, bucket, object.Key))) continue;
      const source = await sourceS3.send(new GetObjectCommand({ Bucket: bucket, Key: object.Key }));
      await targetS3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: object.Key,
          Body: Buffer.from(await source.Body.transformToByteArray()),
          ContentType: source.ContentType,
        }),
      );
      copied++;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  log(`  bucket ${bucket}: ${listed} objects${DRY_RUN ? '' : `, ${copied} copied`}`);
  return { bucket, listed, copied };
}

async function verify(target, report, userIds) {
  log('\nVerification (target rows owned by migrated users vs source):');
  let ok = true;
  for (const { table, source } of report) {
    const columns = await columnsOf(target, table);
    const where = columns.some((c) => c.column_name === 'user_id')
      ? 'user_id = any($1)'
      : 'cv_id in (select id from public.cv where user_id = any($1))';
    const { rows } = await target.query(
      `select count(*)::int as n from public."${table}" where ${where}`,
      [userIds],
    );
    const match = rows[0].n >= source;
    ok &&= match;
    log(`  ${match ? '✓' : '✗'} ${table}: source ${source}, target ${rows[0].n}`);
  }
  return ok;
}

async function main() {
  const source = new pg.Client({ connectionString: requireEnv('SOURCE_DATABASE_URL') });
  const target = new pg.Client({ connectionString: requireEnv('DATABASE_URL') });
  await source.connect();
  await target.connect();

  try {
    log(DRY_RUN ? 'Dry run — nothing will be written.\n' : 'Migrating…\n');
    const userIds = await migrateUsers(source, target);
    log('tables:');
    const report = await migrateTables(source, target, userIds);

    if (!SKIP_STORAGE) {
      log('storage:');
      const sourceS3 = s3Client('SOURCE_');
      const targetS3 = s3Client('');
      for (const bucket of new Set([
        process.env.MEDIA_BUCKET?.trim() || 'media',
        process.env.MCP_EXPORT_BUCKET?.trim() || 'mcp-exports',
      ])) {
        await migrateBucket(sourceS3, targetS3, bucket);
      }
    }

    if (!DRY_RUN) {
      const ok = await verify(target, report, userIds);
      log(ok ? '\nMigration complete.' : '\nMigration finished with mismatches (see ✗ above).');
      log('Reminder: keep MCP_KEY_PEPPER equal to the pepper the Supabase deployment used.');
      if (!ok) process.exitCode = 1;
    }
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
});
