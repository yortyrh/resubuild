import { Module } from '@nestjs/common';
import { CvModule } from '../cv/cv.module';
import { ImportLlmConfigController } from './import-llm-config.controller';
import { ImportLlmConfigRepository, ImportLlmConfigService } from './import-llm-config.service';

@Module({
  imports: [CvModule],
  controllers: [ImportLlmConfigController],
  providers: [ImportLlmConfigRepository, ImportLlmConfigService],
  exports: [ImportLlmConfigRepository, ImportLlmConfigService],
})
export class ImportLlmConfigModule {}
