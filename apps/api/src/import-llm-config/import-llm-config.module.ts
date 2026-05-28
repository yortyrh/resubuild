import { Module } from '@nestjs/common';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { ImportLlmConfigController } from './import-llm-config.controller';
import { ImportLlmConfigRepository, ImportLlmConfigService } from './import-llm-config.service';

@Module({
  imports: [AiAgentModule],
  controllers: [ImportLlmConfigController],
  providers: [ImportLlmConfigRepository, ImportLlmConfigService],
  exports: [ImportLlmConfigRepository, ImportLlmConfigService],
})
export class ImportLlmConfigModule {}
