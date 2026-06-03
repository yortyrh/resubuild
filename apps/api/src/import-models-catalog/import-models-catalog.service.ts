import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  assertImportModelCatalog,
  buildImportModelCatalog,
  fetchImportModelRegistryViaGateway,
  type ImportModelCatalog,
  loadFallbackImportModelCatalog,
  type MastraModelGateway,
  modelsDevGateway,
} from '@resumind/import-models';

export interface ImportModelsCatalogStatus {
  source: 'mastra-gateway' | 'fallback';
  providerCount: number;
  modelCount: number;
  lastRefreshedAt: string | null;
  lastRefreshError: string | null;
}

@Injectable()
export class ImportModelsCatalogService implements OnModuleInit {
  private readonly logger = new Logger(ImportModelsCatalogService.name);
  private catalog: ImportModelCatalog | null = null;
  private source: ImportModelsCatalogStatus['source'] = 'fallback';
  private lastRefreshedAt: Date | null = null;
  private lastRefreshError: string | null = null;

  /**
   * Optional override of the `MastraModelGateway` used to discover supported
   * providers. Defaults to the bundled `modelsDevGateway` (proxies
   * `PROVIDER_REGISTRY` from `@mastra/core`). Tests can swap this for a stub.
   */
  private gateway: MastraModelGateway = modelsDevGateway;

  constructor(private readonly configService: ConfigService) {}

  /** Inject a custom `MastraModelGateway` (used by tests). */
  setGateway(gateway: MastraModelGateway): void {
    this.gateway = gateway;
  }

  async onModuleInit(): Promise<void> {
    await this.refreshCatalog('startup');
  }

  /** Daily refresh from the Mastra gateway + models.dev metadata. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledRefresh(): Promise<void> {
    if (this.useStaticCatalogOnly()) {
      return;
    }
    await this.refreshCatalog('scheduled');
  }

  getCatalog(): ImportModelCatalog {
    if (!this.catalog) {
      throw new ServiceUnavailableException('Import model catalog is not loaded yet');
    }
    return this.catalog;
  }

  getStatus(): ImportModelsCatalogStatus {
    const catalog = this.catalog;
    return {
      source: this.source,
      providerCount: catalog?.providers.length ?? 0,
      modelCount:
        catalog?.providers.reduce((total, provider) => total + provider.models.length, 0) ?? 0,
      lastRefreshedAt: this.lastRefreshedAt?.toISOString() ?? null,
      lastRefreshError: this.lastRefreshError,
    };
  }

  private useStaticCatalogOnly(): boolean {
    return this.configService.get<string>('IMPORT_MODELS_CATALOG_SOURCE') === 'static';
  }

  async refreshCatalog(trigger: 'startup' | 'scheduled' | 'manual' = 'manual'): Promise<void> {
    if (this.useStaticCatalogOnly()) {
      this.applyCatalog(loadFallbackImportModelCatalog(), 'fallback');
      this.lastRefreshError = null;
      this.logger.log('Using static import model catalog (IMPORT_MODELS_CATALOG_SOURCE=static)');
      return;
    }

    try {
      const registry = await fetchImportModelRegistryViaGateway({ gateway: this.gateway });
      const built = buildImportModelCatalog(registry);
      assertImportModelCatalog(built);
      this.applyCatalog(built, 'mastra-gateway');
      this.lastRefreshedAt = new Date();
      this.lastRefreshError = null;
      const modelCount = built.providers.reduce((n, p) => n + p.models.length, 0);
      this.logger.log(
        `Import model catalog refreshed via ${this.gateway.name} (${trigger}): ${built.providers.length} providers, ${modelCount} models`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastRefreshError = message;

      if (!this.catalog) {
        const fallback = loadFallbackImportModelCatalog();
        this.applyCatalog(fallback, 'fallback');
        this.logger.warn(
          `Import model catalog: Mastra gateway unavailable (${trigger}); using bundled fallback (${fallback.providers.length} providers)`,
        );
        return;
      }

      this.logger.warn(
        `Import model catalog refresh failed (${trigger}); keeping previous snapshot: ${message}`,
      );
    }
  }

  private applyCatalog(catalog: ImportModelCatalog, source: ImportModelsCatalogStatus['source']) {
    assertImportModelCatalog(catalog);
    this.catalog = catalog;
    this.source = source;
  }
}
