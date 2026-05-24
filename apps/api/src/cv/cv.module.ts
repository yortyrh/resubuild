import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';

@Module({
  imports: [AuthModule],
  controllers: [CvController],
  providers: [CvService, ResumeSchemaValidator],
})
export class CvModule {}
