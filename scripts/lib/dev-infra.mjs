/**
 * Connection settings of the local Docker infrastructure
 * (`docker-compose.dev.yml`). Shared by `pnpm infra:init` and `pnpm setup:env`
 * so both agree on hosts, ports and credentials. Ports follow the
 * RESUBUILD_*_PORT overrides understood by the compose file.
 */

/** @param {NodeJS.ProcessEnv} [env] */
export function devInfra(env = process.env) {
  const port = (name, fallback) => env[name]?.trim() || fallback;
  const pgPort = port('RESUBUILD_POSTGRES_PORT', '54432');
  const s3Port = port('RESUBUILD_S3_PORT', '54490');
  const smtpPort = port('RESUBUILD_SMTP_PORT', '54425');
  const mailpitPort = port('RESUBUILD_MAILPIT_PORT', '54424');

  return {
    databaseUrl: `postgresql://resubuild:resubuild@127.0.0.1:${pgPort}/resubuild`,
    s3: {
      endpoint: `http://127.0.0.1:${s3Port}`,
      region: 'us-east-1',
      accessKeyId: 'resubuild',
      secretAccessKey: 'resubuild-secret',
      forcePathStyle: true,
    },
    buckets: { media: 'media', mcpExports: 'mcp-exports' },
    smtp: { host: '127.0.0.1', port: smtpPort },
    mailpitUrl: `http://127.0.0.1:${mailpitPort}`,
  };
}
