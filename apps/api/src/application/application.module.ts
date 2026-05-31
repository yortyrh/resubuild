import { Module } from '@nestjs/common';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { AuthModule } from '../auth/auth.module';
import { CvModule } from '../cv/cv.module';
import { CvExportModule } from '../cv-export/cv-export.module';
import { ImportModelsCatalogModule } from '../import-models-catalog/import-models-catalog.module';
import { ApplicationController } from './application.controller';
import { ApplicationRepository } from './application.repository';
import { ApplicationService } from './application.service';

@Module({
  imports: [AuthModule, AiAgentModule, CvModule, CvExportModule, ImportModelsCatalogModule],
  controllers: [ApplicationController],
  providers: [ApplicationRepository, ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
