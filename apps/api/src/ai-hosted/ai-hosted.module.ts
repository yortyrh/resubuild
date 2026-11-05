import { Module } from '@nestjs/common';
import { AiUsageRepository } from './ai-usage.repository';
import { HostedModelsConfigService } from './hosted-models.config';
import { HostedModelsService } from './hosted-models.service';

/** App-funded model pools, their monthly budgets and per-user quotas. */
@Module({
  providers: [HostedModelsConfigService, AiUsageRepository, HostedModelsService],
  exports: [HostedModelsConfigService, HostedModelsService],
})
export class AiHostedModule {}
