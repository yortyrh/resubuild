import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvItemService } from './cv-item.service';
import { CvItemsController } from './cv-items.controller';
import { CvNormalizedRepository } from './cv-normalized.repository';

@Module({
  imports: [AuthModule],
  controllers: [CvController, CvItemsController],
  providers: [CvService, CvItemService, CvNormalizedRepository, ResumeSchemaValidator],
  exports: [CvService, CvItemService, CvNormalizedRepository],
})
export class CvModule {}
