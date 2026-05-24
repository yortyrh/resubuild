import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CvController } from './cv.controller';
import { CvItemsController } from './cv-items.controller';
import { CvItemService } from './cv-item.service';
import { CvService } from './cv.service';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';

@Module({
  imports: [AuthModule],
  controllers: [CvController, CvItemsController],
  providers: [CvService, CvItemService, ResumeSchemaValidator],
  exports: [CvService, CvItemService],
})
export class CvModule {}
