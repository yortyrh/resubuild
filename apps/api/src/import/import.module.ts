import { Module } from '@nestjs/common';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { CvModule } from '../cv/cv.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [CvModule, AiAgentModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
