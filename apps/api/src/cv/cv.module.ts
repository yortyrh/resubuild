import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvItemService } from './cv-item.service';
import { CvItemsController } from './cv-items.controller';
import { CvNormalizedRepository } from './cv-normalized.repository';
import { CvTemplatePresentationRepository } from './cv-template-presentation.repository';
import { CvTemplatePresentationService } from './cv-template-presentation.service';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [CvController, CvItemsController],
  providers: [
    CvService,
    CvItemService,
    CvNormalizedRepository,
    CvTemplatePresentationRepository,
    CvTemplatePresentationService,
    ResumeSchemaValidator,
  ],
  exports: [CvService, CvItemService, CvNormalizedRepository, CvTemplatePresentationService],
})
export class CvModule {}
