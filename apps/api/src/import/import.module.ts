import { Module } from '@nestjs/common';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [AiAgentModule],
  controllers: [ImportController],
  providers: [ImportService, ResumeSchemaValidator],
  exports: [ImportService],
})
export class ImportModule {}
