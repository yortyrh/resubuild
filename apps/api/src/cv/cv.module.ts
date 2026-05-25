import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvItemService } from './cv-item.service';
import { CvItemsController } from './cv-items.controller';

@Module({
  imports: [AuthModule],
  controllers: [CvController, CvItemsController],
  providers: [CvService, CvItemService, ResumeSchemaValidator],
  exports: [CvService, CvItemService],
})
export class CvModule {}
