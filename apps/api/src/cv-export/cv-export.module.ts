import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CvModule } from '../cv/cv.module';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvExportController } from './cv-export.controller';
import { CvExportService } from './cv-export.service';

@Module({
  imports: [AuthModule, CvModule],
  controllers: [CvExportController],
  providers: [CvExportService, ResumeSchemaValidator],
})
export class CvExportModule {}
