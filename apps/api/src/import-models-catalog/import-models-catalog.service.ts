import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  assertImportModelCatalog,
  buildImportModelCatalog,
  fetchModelsDevRegistry,
  type ImportModelCatalog,
  loadFallbackImportModelCatalog,
  MODELS_DEV_API_URL,
} from '@resumind/import-models';

export interface ImportModelsCatalogStatus {
  source: 'models.dev' | 'fallback';
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

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.refreshCatalog('startup');
  }

  /** Daily refresh from models.dev (Mastra provider registry). */
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

  private modelsDevApiUrl(): string {
    return this.configService.get<string>('MODELS_DEV_API_URL') ?? MODELS_DEV_API_URL;
  }

  async refreshCatalog(trigger: 'startup' | 'scheduled' | 'manual' = 'manual'): Promise<void> {
    if (this.useStaticCatalogOnly()) {
      this.applyCatalog(loadFallbackImportModelCatalog(), 'fallback');
      this.lastRefreshError = null;
      this.logger.log('Using static import model catalog (IMPORT_MODELS_CATALOG_SOURCE=static)');
      return;
    }

    try {
      const registry = await fetchModelsDevRegistry(this.modelsDevApiUrl());
      const built = buildImportModelCatalog(registry);
      assertImportModelCatalog(built);
      this.applyCatalog(built, 'models.dev');
      this.lastRefreshedAt = new Date();
      this.lastRefreshError = null;
      const modelCount = built.providers.reduce((n, p) => n + p.models.length, 0);
      this.logger.log(
        `Import model catalog refreshed (${trigger}): ${built.providers.length} providers, ${modelCount} models`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastRefreshError = message;

      if (!this.catalog) {
        const fallback = loadFallbackImportModelCatalog();
        this.applyCatalog(fallback, 'fallback');
        this.logger.warn(
          `Import model catalog: models.dev unavailable (${trigger}); using bundled fallback (${fallback.providers.length} providers)`,
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
