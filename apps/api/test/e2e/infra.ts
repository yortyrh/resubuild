import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { runMigrations } from '@resubuild/db';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

/** Same images as docker-compose.dev.yml. */
export const E2E_IMAGES = {
  postgres: 'docker.io/library/postgres:18-alpine',
  storage: 'docker.io/rustfs/rustfs:1.0.4',
  mailpit: 'docker.io/axllent/mailpit:v1.33.0',
} as const;

const S3_ACCESS_KEY = 'e2e-access';
const S3_SECRET_KEY = 'e2e-secret-key';
export const E2E_BUCKETS = { media: 'media', mcpExports: 'mcp-exports' } as const;

export interface E2eInfra {
  env: Record<string, string>;
  mailpitUrl: string;
  stop: () => Promise<void>;
}

/**
 * Starts throw-away Postgres (data on tmpfs, fsync off), S3 storage and
 * Mailpit containers, applies the migrations and creates the buckets.
 * Returns the env the API needs to talk to them.
 */
export async function startE2eInfra(): Promise<E2eInfra> {
  const started = await Promise.allSettled([
    new PostgreSqlContainer(E2E_IMAGES.postgres)
      .withDatabase('resubuild')
      .withUsername('resubuild')
      .withPassword('resubuild')
      .withTmpFs({ '/var/lib/postgresql': 'rw' })
      .withCommand(['postgres', '-c', 'fsync=off', '-c', 'synchronous_commit=off'])
      .start(),
    new GenericContainer(E2E_IMAGES.storage)
      .withEnvironment({ RUSTFS_ACCESS_KEY: S3_ACCESS_KEY, RUSTFS_SECRET_KEY: S3_SECRET_KEY })
      // RustFS runs as a non-root user; make the tmpfs writable for it.
      .withTmpFs({ '/data': 'rw,mode=1777' })
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forListeningPorts())
      .start(),
    new GenericContainer(E2E_IMAGES.mailpit)
      .withExposedPorts(1025, 8025)
      .withWaitStrategy(Wait.forHttp('/livez', 8025))
      .start(),
  ]);

  const containers = started
    .filter((r): r is PromiseFulfilledResult<StartedTestContainer> => r.status === 'fulfilled')
    .map((r) => r.value);
  const stop = async () => {
    await Promise.allSettled(containers.map((c) => c.stop({ timeout: 5_000 })));
  };

  const failure = started.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failure) {
    await stop();
    throw failure.reason;
  }
  const [postgres, storage, mailpit] = containers as [
    StartedPostgreSqlContainer,
    StartedTestContainer,
    StartedTestContainer,
  ];

  try {
    const databaseUrl = postgres.getConnectionUri();
    const s3Endpoint = `http://${storage.getHost()}:${storage.getMappedPort(9000)}`;
    const mailpitUrl = `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}`;

    await runMigrations(databaseUrl);
    await createBuckets(s3Endpoint);

    return {
      mailpitUrl,
      stop,
      env: {
        DATABASE_URL: databaseUrl,
        S3_ENDPOINT: s3Endpoint,
        S3_PUBLIC_ENDPOINT: s3Endpoint,
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY_ID: S3_ACCESS_KEY,
        S3_SECRET_ACCESS_KEY: S3_SECRET_KEY,
        S3_FORCE_PATH_STYLE: 'true',
        MEDIA_BUCKET: E2E_BUCKETS.media,
        MCP_EXPORT_BUCKET: E2E_BUCKETS.mcpExports,
        SMTP_HOST: mailpit.getHost(),
        SMTP_PORT: String(mailpit.getMappedPort(1025)),
        SMTP_SECURE: 'false',
        MAIL_FROM: 'Resubuild E2E <e2e@resubuild.local>',
        E2E_MAILPIT_URL: mailpitUrl,
      },
    };
  } catch (error) {
    await stop();
    throw error;
  }
}

async function createBuckets(endpoint: string): Promise<void> {
  const s3 = new S3Client({
    endpoint,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
  });
  try {
    for (const bucket of Object.values(E2E_BUCKETS)) {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  } finally {
    s3.destroy();
  }
}
