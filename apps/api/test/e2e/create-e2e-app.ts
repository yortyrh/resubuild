/**
 * Boots the API's `AppModule` inside a Jest testing harness.
 *
 * Both `AppModule` and `@nestjs/testing` are intentionally `require()`'d
 * inside the function body instead of being imported at the top of this
 * file. The `MCP_SERVER_ENABLED=false` describe block in
 * `api.e2e-spec.ts` mutates the env var, then calls
 * `jest.resetModules()` and `createE2eApp()`. If `AppModule` were imported
 * here statically, it would be evaluated once at module load and
 * `McpModule`'s `isMcpServerDisabled()` check would have run with the
 * previous env value, so the wrapper would still mount and `POST /mcp`
 * would hit `McpApiKeyGuard` instead of returning 404. The same reasoning
 * applies to `Test` from `@nestjs/testing`: a cached reference would use
 * the old `ModulesContainer` from the first `Test.createTestingModule()`
 * call, which is incompatible with the freshly-required `AppModule` and
 * the `@rekog/mcp-nest` wrapper's `DiscoveryService` after the reset.
 */
type INestApplication = import('@nestjs/common').INestApplication;

export async function createE2eApp(): Promise<INestApplication> {
  process.env.IMPORT_MODELS_CATALOG_SOURCE ??= 'static';
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Test } = require('@nestjs/testing') as typeof import('@nestjs/testing');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { configureApp } =
    require('../../src/configure-app') as typeof import('../../src/configure-app');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // Same HTTP wiring as main.ts (Better Auth handler before the body parsers).
  const app = moduleRef.createNestApplication({ bodyParser: false });
  configureApp(app);
  await app.init();
  return app;
}
