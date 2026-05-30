import { Module } from '@nestjs/common';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { CvModule } from '../cv/cv.module';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { WebScrapeModule } from '../web-scrape/web-scrape.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [CvModule, AiAgentModule, WebScrapeModule],
  controllers: [ImportController],
  providers: [ImportService, ResumeSchemaValidator],
})
export class ImportModule {}
