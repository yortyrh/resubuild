import { Module } from '@nestjs/common';
import { CvModule } from '../cv/cv.module';
import { ImportLlmConfigModule } from '../import-llm-config/import-llm-config.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [CvModule, ImportLlmConfigModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
