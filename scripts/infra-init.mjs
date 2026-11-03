#!/usr/bin/env node
/**
 * Prepares the local Docker infrastructure after `docker compose up`:
 * waits for Postgres, applies the Drizzle migrations and creates the
 * object-storage buckets. Idempotent; safe to re-run.
 *
 * Usage: node scripts/infra-init.mjs   (run by `pnpm infra:up`)
 */
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { runMigrations } from '@resubuild/db';
import pg from 'pg';
import { devInfra } from './lib/dev-infra.mjs';

const infra = devInfra();
const databaseUrl = process.env.DATABASE_URL?.trim() || infra.databaseUrl;

async function retry(label, fn, { attempts = 60, delayMs = 1000 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`${label} not reachable: ${lastError?.message ?? lastError}`);
}

async function waitForPostgres() {
  await retry('Postgres', async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query('select 1');
    await client.end();
  });
}

async function ensureBuckets() {
  const s3 = new S3Client({
    endpoint: infra.s3.endpoint,
    region: infra.s3.region,
    forcePathStyle: infra.s3.forcePathStyle,
    credentials: { accessKeyId: infra.s3.accessKeyId, secretAccessKey: infra.s3.secretAccessKey },
  });
  for (const bucket of Object.values(infra.buckets)) {
    await retry(`Object storage (${infra.s3.endpoint})`, async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch (error) {
        if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== 'NotFound') throw error;
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log(`Created bucket ${bucket}`);
      }
    });
  }
}

await waitForPostgres();
await runMigrations(databaseUrl);
console.log('Database migrations applied');
await ensureBuckets();
console.log(`Buckets ready: ${Object.values(infra.buckets).join(', ')}`);
console.log(`Mailpit UI: ${infra.mailpitUrl}`);
